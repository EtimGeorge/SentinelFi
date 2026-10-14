import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ClsService } from "nestjs-cls";
import { runInMasterSchema } from "../../database/tenancy-aware-data-source";
import { DataSource } from "typeorm";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { TenantProvisioningStatus } from "@shared/types/tenant-provisioning-status.enum";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

/**
 * Resolved tenant context from a single round trip: the authoritative tenant row
 * joined against the physical schema catalog.
 */
interface ResolvedTenantContext {
  tenant_id: string;
  schema_name: string;
  provisioning_status: string | null;
  schema_exists: boolean;
  is_active: boolean;
  deleted_at: Date | string | null;
}

/**
 * `tenants.tenant_id` is a uuid column. The value reaching this guard originates
 * in a signed JWT, so its provenance is trusted but its shape is not: casting a
 * malformed string with `$1::uuid` raises Postgres 22P02, which would surface as
 * an opaque 500 instead of the correct "unknown tenant" answer. Validating the
 * shape here keeps that failure typed, cheap, and index-friendly.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class TenancyGuard implements CanActivate {
  private readonly logger = new Logger(TenancyGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.cls.set("SCHEMA_NAME", "public");
      this.cls.set("tenant_id", null);
      return true;
    }

    // 2. For non-public routes, expect req.user to be populated by JwtAuthGuard
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // This should theoretically be handled by JwtAuthGuard, but we add a safety check.
      this.logger.warn("No user found on non-public request in TenancyGuard.");
      this.cls.set("SCHEMA_NAME", "public");
      return true;
    }

    const tenantId = user.tenant_id;

    // 3. Resolve Tenant Schema
    if (!tenantId) {
      // User is authenticated but has no tenant (e.g., initial SuperAdmin or unassigned user)
      this.cls.set("SCHEMA_NAME", "public");
      this.cls.set("tenant_id", null);
      this.cls.set("USER", user);
      return true;
    }

    // 3. Resolve Tenant Schema — row state AND physical schema existence in a
    //    single round trip. Checking only the row's provisioning_status is not
    //    enough: that column is a claim, and a row left at ACTIVE after its
    //    schema was dropped used to sail straight through to the query layer,
    //    where `SET search_path TO <missing>, public` made Postgres silently
    //    fall through to `public` and tenant tables 500'd with the opaque
    //    `relation "project" does not exist`. This guard is the boundary that
    //    turns that class of corruption into a loud, typed error.
    try {
      const resolved = await this.resolveTenantContext(tenantId);

      if (!resolved) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
      }

      // (0) Deactivated / soft-deleted workspaces are closed for business.
      //     is_active=false or deleted_at set means the workspace was shut
      //     down: every request fails here with a clear 403 instead of
      //     sailing through to an empty (or stale) schema and surfacing as
      //     confusing empty screens ("No active projects found") downstream.
      //     Checked FIRST so a dead workspace never leaks any other state.
      if (resolved.is_active === false || resolved.deleted_at !== null) {
        this.logger.warn(
          `[TenancyGuard] Blocked request for deactivated tenant ${tenantId}.`,
        );
        throw new ForbiddenException({
          code: "TENANT_DEACTIVATED",
          message:
            "This workspace has been deactivated. Please contact your administrator or switch to an active workspace.",
        });
      }

      // (a) Physical schema must exist. Fail closed, record the corruption on
      //     the row so the SuperAdmin UI surfaces it, and stop retrying.
      if (!resolved.schema_exists) {
        // Only an ACTIVE row that claims a schema which does not exist is
        // corruption. A PENDING row with no schema yet is normal, in-flight
        // provisioning — flagging that FAILED would abort a healthy attempt.
        if (resolved.provisioning_status === TenantProvisioningStatus.ACTIVE) {
          await this.markTenantSchemaMissing(resolved);
        }

        throw new ServiceUnavailableException({
          code: "TENANT_SCHEMA_MISSING",
          message:
            "This workspace's data store is unavailable. An administrator has been alerted.",
          retryAfter: 30,
        });
      }

      // (b) Provisioning state must be ACTIVE (reservation-first provisioning
      //     means a row can exist before its schema is usable).
      const provisioningStatus = resolved.provisioning_status;
      if (
        provisioningStatus &&
        provisioningStatus !== TenantProvisioningStatus.ACTIVE
      ) {
        throw new ServiceUnavailableException({
          code: "TENANT_NOT_PROVISIONED",
          message:
            "This workspace is not ready yet. Please try again in a few moments.",
          retryAfter: 5,
        });
      }

      const schemaName = resolved.schema_name;

      this.cls.set("tenant_id", tenantId);
      this.cls.set("SCHEMA_NAME", schemaName);
      this.cls.set("USER", user);

      this.logger.debug(
        `[TenancyGuard] Context set for User ${user.id}. Tenant: ${tenantId}, Schema: ${schemaName}`,
      );

      return true;
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[TenancyGuard] ❌ Failed to resolve tenant schema for User ${user.id} (Tenant: ${tenantId}): ${message}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Resolves the tenant row and the PHYSICAL existence of its schema in a
   * single round trip.
   *
   * `pg_catalog.pg_namespace` is the source of truth for "this schema exists";
   * `tenants.schema_name` is only a claim about it. The join is deliberately a
   * LEFT join: a missing schema must come back as `schema_exists = false` on a
   * returned row rather than as "no row at all", so the caller can tell an
   * unknown tenant apart from a known tenant whose data store has vanished and
   * report each accurately.
   *
   * Both relations are schema-qualified and the predicate is parameterised. This
   * runs BEFORE the request's `search_path` is switched to the tenant schema and
   * the tenant id arrives from a JWT, so the lookup must depend on neither
   * ambient session state nor string interpolation.
   */
  private async resolveTenantContext(
    tenantId: string,
  ): Promise<ResolvedTenantContext | null> {
    if (!UUID_PATTERN.test(tenantId)) {
      return null;
    }

    const rows = (await runInMasterSchema(this.cls, () =>
      this.dataSource.query(
         `SELECT t.tenant_id::text     AS tenant_id,
                  t.schema_name         AS schema_name,
                  t.provisioning_status AS provisioning_status,
                  t.is_active           AS is_active,
                  t.deleted_at          AS deleted_at,
                  (n.oid IS NOT NULL)   AS schema_exists
            FROM public.tenants t
           LEFT JOIN pg_catalog.pg_namespace n
                  ON n.nspname = t.schema_name
          WHERE t.tenant_id = $1::uuid
          LIMIT 1`,
        [tenantId],
      ),
    )) as Array<{
      tenant_id: string;
      schema_name: string;
      provisioning_status: string | null;
      schema_exists: boolean;
      is_active: boolean;
      deleted_at: Date | string | null;
    }>;

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      tenant_id: row.tenant_id,
      schema_name: row.schema_name,
      provisioning_status: row.provisioning_status,
      schema_exists: row.schema_exists === true,
      is_active: row.is_active !== false,
      deleted_at: row.deleted_at ?? null,
    };
  }

  /**
   * Records a detected "ACTIVE tenant whose schema is gone" as a durable FAILED
   * provisioning state, so the corruption is visible in the SuperAdmin UI
   * instead of living only in a log line, and drops the JwtAuthGuard status
   * cache entry so queued requests cannot keep sailing through on a stale ACTIVE
   * value for the remainder of its TTL.
   *
   * Deliberately best-effort and never throwing: the caller is already about to
   * raise a typed 503. Failing to persist the flag degrades observability — it
   * must never upgrade the client's answer from 503 into a 500.
   */
  private async markTenantSchemaMissing(
    resolved: ResolvedTenantContext,
  ): Promise<void> {
    const reason =
      `Tenant schema "${resolved.schema_name}" is recorded in public.tenants but ` +
      `does not exist in the database catalog (detected while serving a request).`;

    this.logger.error(
      `[TenancyGuard] ❌ Tenant ${resolved.tenant_id} claims schema ` +
        `"${resolved.schema_name}", which does not exist. Marking provisioning FAILED.`,
    );

    JwtAuthGuard.invalidateTenantStatus(resolved.tenant_id);

    if (resolved.provisioning_status === TenantProvisioningStatus.FAILED) {
      // An earlier request already flagged this tenant. Do not rewrite the row
      // on every subsequent request — the 503 raised by the caller is already
      // the correct answer, and this path can be hot.
      return;
    }

    try {
      await this.dataSource.query(
        `UPDATE public.tenants
            SET provisioning_status = $2,
                provisioning_error  = $3,
                updated_at          = now()
          WHERE tenant_id = $1::uuid`,
        [resolved.tenant_id, TenantProvisioningStatus.FAILED, reason],
      );
    } catch (error: unknown) {
      this.logger.error(
        `[TenancyGuard] Failed to flag tenant ${resolved.tenant_id} as FAILED: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
