import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { Logger } from "@nestjs/common";
import { ClsService, ClsServiceManager } from "nestjs-cls";

/**
 * Thrown when a request-scoped database call reaches the driver without a
 * tenant schema.
 *
 * Previously this state logged a warning and silently resolved queries against
 * `public`. Every tenant table is invisible from `public`, so the call did not
 * fail — it failed *later*, as an opaque
 * `relation "project" does not exist` raised from an unrelated line of a
 * repository, with no tenant or correlation id attached. That indirection is
 * what made this class of bug so expensive to trace.
 *
 * This is thrown only for the "CLS context is active but SCHEMA_NAME is unset"
 * case. That combination cannot occur on a healthy request: the global
 * `TenancyGuard` sets SCHEMA_NAME for every route, including public ones
 * (which get `"public"`). Unset therefore means the guard chain did not run for
 * this request, which is always a bug. Genuine system work — migrations, CLI,
 * schedulers — has no CLS context at all and keeps the `public` fallback.
 */
export class TenantContextMissingError extends Error {
  readonly correlationId: string;

  constructor(correlationId: string) {
    super(
      `Tenant schema is unresolved for this database call (correlationId=${correlationId}). ` +
        `A CLS context is active but SCHEMA_NAME was never set, which means the ` +
        `TenancyGuard did not run for this request. Refusing to query "public": ` +
        `tenant tables are invisible there, so the call would otherwise fail later ` +
        `as a misleading "relation does not exist".`,
    );
    this.name = "TenantContextMissingError";
    this.correlationId = correlationId;
  }
}

/**
 * Runs `fn` with the master (`public`) schema declared as the active context.
 *
 * A handful of call sites legitimately query master-schema tables before
 * `TenancyGuard` has resolved a tenant — authentication must load the user and
 * the tenant row to work out *which* tenant it is serving. Those entities are
 * pinned to `public` (`@Entity({ schema: "public" })`) or written as fully
 * qualified SQL against `public.tenants` / `pg_catalog`, so they are correct
 * without a tenant and do not need one.
 *
 * They must still say so. `TenantContextMissingError` cannot tell a
 * fully-qualified master query apart from a tenant query that is relying on
 * `search_path`, so the intent is declared here instead of inferred. Tenant
 * queries get no such opt-in and keep failing loudly.
 */
export async function runInMasterSchema<T>(
  cls: ClsService,
  fn: () => Promise<T>,
): Promise<T> {
  return cls.run(() => {
    cls.set("SCHEMA_NAME", "public");
    return fn();
  });
}

/**
 * Custom DataSource that wraps the standard TypeORM DataSource to implement multi-tenancy.
 * It uses the 'nestjs-cls' service (Async Local Storage) to retrieve the current tenant's
 * schema name and ensures that every QueryRunner created sets the PostgreSQL 'search_path'
 * to that schema.
 *
 * In addition to search_path, every connection sets the `app.current_tenant_id` session
 * variable. Row-Level Security policies on shared public tables (audit_log, email_log)
 * evaluate against that variable, so cross-tenant reads of shared data are blocked at the
 * database layer even if application-level WHERE clauses regress. `SYS` denotes platform /
 * SuperAdmin / background system contexts with no tenant scope.
 */
export class TenancyAwareDataSource extends DataSource {
  // Named `tenancyLogger` because `DataSource` already declares `logger` for
  // TypeORM's own query logging, and shadowing it breaks assignability.
  private readonly tenancyLogger = new Logger("TenancyAwareDataSource");

  constructor(
    options: DataSourceOptions,
    private readonly cls?: ClsService,
  ) {
    super(options);
  }

  /**
   * Overrides the default createQueryRunner to inject tenant context.
   * @param mode Replication mode (master/slave) - passed through to super
   */
  createQueryRunner(mode?: "master" | "slave"): QueryRunner {
    const queryRunner = super.createQueryRunner(mode);
    const originalConnect = queryRunner.connect.bind(queryRunner);
    let isSwitching = false;

    // Override the connect method of the QueryRunner
    queryRunner.connect = async () => {
      let correlationId = "N/A";
      let schemaName = "public";
      let tenantId: string | null = null;
      // Why the schema resolved to "public". Tracked so a tenant-scoped query
      // that silently lands in public is attributable in the log rather than
      // surfacing much later as `relation "project" does not exist`.
      let publicFallbackReason: "no-cls" | "missing-schema-name" | null = null;

      try {
        const cls = ClsServiceManager.getClsService();
        correlationId = cls.get("correlationId") || "N/A";
        const resolvedSchema = cls.get("SCHEMA_NAME");
        tenantId = cls.get("tenant_id") || null;

        // `getClsService()` resolves even when no context is bound, so an
        // undefined SCHEMA_NAME alone cannot distinguish "system job" from
        // "request whose guard chain never ran". `isActive()` can: it is true
        // only inside a context established by the CLS middleware.
        if (resolvedSchema) {
          schemaName = resolvedSchema;
        } else if (cls.isActive()) {
          publicFallbackReason = "missing-schema-name";
        } else {
          publicFallbackReason = "no-cls";
        }
      } catch (e) {
        // CLS not available in this context (e.g. background task).
        // SECURITY (Flaw E-adjacent): a missing CLS context defaults tenantId
        // to null below, which resolves to the SYS RLS context. That is
        // correct ONLY for system-initiated work (migrations, CLI, schedulers).
        // Request paths always run inside CLS middleware — if you are reading
        // this because a request hit SYS, the CLS middleware chain is broken,
        // not this fallback.
        publicFallbackReason = "no-cls";
      }

      if (publicFallbackReason === "missing-schema-name") {
        // Fail here, BEFORE acquiring a physical connection, so the failure is
        // attributable to the missing tenant context instead of surfacing as
        // `relation "project" does not exist` from inside a repository, and so
        // no pooled connection is checked out for a call that cannot succeed.
        throw new TenantContextMissingError(correlationId);
      } else if (publicFallbackReason === "no-cls") {
        // Expected for migrations, CLI, and schedulers. Debug level so a
        // provisioning run does not flood the log.
        this.tenancyLogger.debug(
          `[TenancyAwareDataSource] No CLS context; queries resolve to "public" ` +
            `(system/SYS context).`,
        );
      }

      // 1. Establish the physical connection
      // We MUST return the connection object that TypeORM expects
      const connection = await originalConnect();

      // 2. Set per-connection context unless we are mid-switch (recursion guard).
      //    search_path is always reset so a pooled connection never leaks a prior
      //    tenant's schema into the next request.
      if (!isSwitching) {
        isSwitching = true;
        try {
          const sanitizedSchema = schemaName.replace(/[^a-z0-9_]/gi, "");
          // RLS context: a tenant uuid, or SYS for platform/system/SuperAdmin contexts.
          // Only hex/hyphens survive sanitization so this is safe for a SET literal.
          const rlsTenantContext =
            tenantId && /^[0-9a-fA-F-]{36}$/.test(tenantId) ? tenantId : "SYS";
          const setContext = async () => {
            if (
              this.driver &&
              typeof (this.driver as any).query === "function"
            ) {
              await (this.driver as any).query(
                `SET search_path TO ${sanitizedSchema}, public`,
                undefined,
                queryRunner,
              );
              await (this.driver as any).query(
                `SET app.current_tenant_id = '${rlsTenantContext}'`,
                undefined,
                queryRunner,
              );
            } else {
              await queryRunner.query(
                `SET search_path TO ${sanitizedSchema}, public`,
              );
              await queryRunner.query(
                `SET app.current_tenant_id = '${rlsTenantContext}'`,
              );
            }
          };

          try {
            await setContext();
          } catch (firstErr: any) {
            // If a previous query left the connection in a broken transaction state,
            // issue ROLLBACK to clean it up and retry the context switch.
            if (firstErr?.message?.includes("current transaction is aborted")) {
              console.warn(
                `[TenancyAwareDataSource][CID: ${correlationId}] Recovering from aborted transaction, issuing ROLLBACK and retrying...`,
              );
              try {
                await queryRunner.query("ROLLBACK");
              } catch (_rollbackErr) {
                // ROLLBACK itself might fail if no transaction is active, that's OK
              }
              await setContext();
            } else {
              throw firstErr;
            }
          }
        } catch (err) {
          console.error(
            `[TenancyAwareDataSource][CID: ${correlationId}] Connection/Schema switch failed:`,
            err,
          );
          throw err;
        } finally {
          isSwitching = false;
        }
      }

      return connection;
    };

    return queryRunner;
  }
}
