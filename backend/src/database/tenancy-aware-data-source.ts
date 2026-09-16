import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { ClsService, ClsServiceManager } from "nestjs-cls";

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

      try {
        const cls = ClsServiceManager.getClsService();
        correlationId = cls.get("correlationId") || "N/A";
        schemaName = cls.get("SCHEMA_NAME") || "public";
        tenantId = cls.get("tenant_id") || null;
      } catch (e) {
        // CLS not available in this context (e.g. background task).
        // SECURITY (Flaw E-adjacent): a missing CLS context defaults tenantId
        // to null below, which resolves to the SYS RLS context. That is
        // correct ONLY for system-initiated work (migrations, CLI, schedulers).
        // Request paths always run inside CLS middleware — if you are reading
        // this because a request hit SYS, the CLS middleware chain is broken,
        // not this fallback.
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
            tenantId &&
            /^[0-9a-fA-F-]{36}$/.test(tenantId)
              ? tenantId
              : "SYS";
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