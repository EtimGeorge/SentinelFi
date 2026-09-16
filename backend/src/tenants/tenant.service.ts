import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { TenantEntity } from "./tenant.entity";
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantBrandingDto,
} from "../superadmin/dto/create-tenant.dto";
import { WbsService } from "../wbs/wbs.service"; // For seeding data
import { AuditService } from "../audit/audit.service"; // NEW: Import AuditService
import { TenantMigrationService } from "../database/tenant-migration.service"; // NEW: Import TenantMigrationService
import { AuthService } from "../auth/auth.service"; // NEW: Import AuthService
import { InvitationService } from "../auth/invitation.service"; // NEW: Import InvitationService

import { Role } from "@shared/types/role.enum"; // NEW: Import Role enum
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  deriveSchemaName,
  assertValidSchemaName,
  quoteSchemaIdentifier,
} from "../common/utils/schema-name.util";
import { TenantProvisioningStatus } from "@shared/types/tenant-provisioning-status.enum";
import { PROVISIONING_STALE_MS } from "@shared/types/tenant-provisioning-status.enum";

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => WbsService))
    private readonly wbsService: WbsService, // Inject WbsService (circular: TenantService <-> WbsService)
    private readonly auditService: AuditService, // NEW: Inject AuditService
    private readonly tenantMigrationService: TenantMigrationService, // NEW: Inject TenantMigrationService
    private readonly authService: AuthService, // NEW: Inject AuthService for user creation
    private readonly invitationService: InvitationService, // NEW: Inject InvitationService
  ) {}

    /**
   * Creates a new tenant using reservation-first provisioning:
   *  - PHASE 0: reserve a tenant row (provisioning_status=PENDING) under an
   *    atomic transaction; the unique(schema_name) constraint serializes
   *    concurrent creators so no destructive DROP-SCHEMA preflight is needed.
   *  - PHASE 1: create + commit the PostgreSQL schema (separate connection —
   *    the TenantMigrationService DataSource opens its own link and must see
   *    the committed schema).
   *  - PHASE 2: run tenant migrations, then promote the row to ACTIVE.
   *    On any Phase 2 failure the orphan schema is dropped and the row is
   *    marked FAILED (never left hanging in PENDING, which would leak the
   *    schema_name under the unique constraint).
   *  - PHASE 3: invite the initial admin (best-effort; does NOT roll back
   *    an ACTIVE tenant).
   *
   * Any schema name reaches DDL only through `quoteSchemaIdentifier` /
   * `assertValidSchemaName` — raw derivation is gone (R1b).
   */
  async createTenant(
    createTenantDto: CreateTenantDto,
    initialBudgetFile?: Express.Multer.File,
    actor?: { id: string; email: string },
  ): Promise<TenantEntity & { admin_password?: string }> {
    // R1b: canonical, NAMEDATALEN-safe schema-name derivation (single source
    // of truth). Previously triplicated across createTenant, startFreeTrial and
    // startFreePlan with divergent truncation — the same company name resolved
    // to different schema names. deriveSchemaName also rejects reserved names
    // and any value that would silently truncate.
    const baseName = createTenantDto.schema_name ?? createTenantDto.name;
    const schema_name = deriveSchemaName(baseName);

    // R1e-reservation: write the tenant ROW before creating the schema. This
    // makes intent durable, gives a crashed run a recoverable anchor, and lets
    // the unique(schema_name) row constraint serialize concurrent creators —
    // replacing the old destructive DROP-SCHEMA preflight that could race and
    // destroy a live tenant's schema.
    const reservationQr = this.dataSource.createQueryRunner();
    await reservationQr.connect();
    await reservationQr.startTransaction();
    try {
      const existing = await reservationQr.manager.findOne(TenantEntity, {
        where: [{ name: createTenantDto.name }, { schema_name }],
        select: [
          "tenant_id",
          "name",
          "schema_name",
          "provisioning_status",
          "provisioning_started_at",
        ],
      });

      if (existing) {
        const stale =
          existing.provisioning_status === TenantProvisioningStatus.PENDING &&
          existing.provisioning_started_at &&
          Date.now() -
            new Date(existing.provisioning_started_at).getTime() >
            PROVISIONING_STALE_MS;

        if (!stale) {
          // Flaw D (knowable-tenant rule): the blocking tenant is a DIFFERENT
          // tenant, so this failure is genuinely unattributable to the
          // (never-created) target. Route through the explicit SYS-write path
          // so RLS cannot swallow the audit trail for this security event.
          await reservationQr.rollbackTransaction();
          this.auditService
            .logSysWrite(
              actor?.id ?? null,
              "TENANT_CREATION_FAILED",
              `Conflicting tenant name or schema name: ${createTenantDto.name}/${schema_name}`,
              {
                requestedName: createTenantDto.name,
                requestedSchemaName: schema_name,
                actorEmail: actor?.email ?? null,
                reason: "Conflict: Tenant or schema name already exists.",
              },
              actor?.email ?? null,
            )
            .catch((err) =>
              this.logger.error(
                `Failed to log tenant creation conflict: ${err.message}`,
              ),
            );
          throw new ConflictException(
            "Tenant with this name or a conflicting schema name already exists.",
          );
        }

        this.logger.warn(
          `Resuming stale PENDING provisioning for schema "${schema_name}" (tenant ${existing.tenant_id}).`,
        );
        await reservationQr.manager.update(
          TenantEntity,
          { tenant_id: existing.tenant_id },
          { provisioning_status: TenantProvisioningStatus.PENDING, provisioning_error: null },
        );
      } else {
        const reserved = reservationQr.manager.create(TenantEntity, {
          name: createTenantDto.name,
          schema_name,
          plan: createTenantDto.plan ?? "basic",
          default_currency_code: createTenantDto.default_currency_code ?? "USD",
          is_active: createTenantDto.is_active ?? true,
          provisioning_status: TenantProvisioningStatus.PENDING,
          provisioning_started_at: new Date(),
        });
        await reservationQr.manager.save(reserved);
      }
      await reservationQr.commitTransaction();
    } catch (err: any) {
      await reservationQr.rollbackTransaction();
      if (err.code === "23505") {
        this.auditService
          .logSysWrite(
            actor?.id ?? null,
            "TENANT_CREATION_FAILED",
            `Race lost: schema or name already claimed: ${schema_name}`,
            { requestedSchemaName: schema_name, reason: "Unique constraint violation on concurrent creation." },
            actor?.email ?? null,
          )
          .catch((e) =>
            this.logger.error(`Failed to log race conflict: ${e.message}`),
          );
        throw new ConflictException(
          "Tenant with this name or a conflicting schema name already exists.",
        );
      }
      throw err;
    } finally {
      await reservationQr.release();
    }

    const targetTenant = await this.tenantRepository.findOneOrFail({
      where: { schema_name },
      select: ["tenant_id", "name", "schema_name", "plan", "default_currency_code"],
    });

    // PHASE 1: create schema (committed immediately — the TenantMigrationService
    // opens a fresh DataSource that must see the committed schema).
    const schemaId = quoteSchemaIdentifier(schema_name);
    const schemaQr = this.dataSource.createQueryRunner();
    await schemaQr.connect();
    await schemaQr.startTransaction();
    let schemaCreated = false;
    try {
      this.logger.log(`[Phase 1] Creating schema: ${schema_name}`);
      await schemaQr.query(`CREATE SCHEMA IF NOT EXISTS ${schemaId}`);
      await schemaQr.commitTransaction();
      schemaCreated = true;
    } catch (schemaError) {
      await schemaQr.rollbackTransaction();
      await this.markProvisioningFailed(targetTenant.tenant_id, schemaError);
      throw new InternalServerErrorException(
        `Could not create tenant schema "${schema_name}": ${schemaError instanceof Error ? schemaError.message : "Unknown error"}`,
      );
    } finally {
      await schemaQr.release();
    }


    // PHASE 2: migrations + promotion to ACTIVE
    try {
      this.logger.log(`[Phase 2] Running migrations for schema: ${schema_name}`);
      await this.tenantMigrationService.runTenantMigrations(schema_name);
      this.logger.log(`[Phase 2] Migrations applied to "${schema_name}".`);

      await this.tenantRepository.update(targetTenant.tenant_id, {
        provisioning_status: TenantProvisioningStatus.ACTIVE,
        provisioning_error: null,
      });
      JwtAuthGuard.invalidateTenantStatus(targetTenant.tenant_id);
      this.logger.log(`[Phase 2] ✅ Tenant "${targetTenant.name}" promoted to ACTIVE.`);
    } catch (err: unknown) {
      if (schemaCreated) {
        try {
          await this.dropTenantSchema(schema_name);
          this.logger.log(`[Cleanup] Dropped orphaned schema "${schema_name}".`);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to drop orphaned schema "${schema_name}": ${cleanupError instanceof Error ? cleanupError.message : "Unknown error"}`,
          );
        }
      }
      await this.markProvisioningFailed(targetTenant.tenant_id, err);
      throw new InternalServerErrorException(
        `Provisioning failed for "${schema_name}": ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }

    // PHASE 3: best-effort side effects. Tenant is ACTIVE; failures here do NOT
    // roll back provisioning — SuperAdmin can re-trigger the invitation.
    if (initialBudgetFile) {
      this.logger.warn(`File processing for '${initialBudgetFile.originalname}' is not yet implemented.`);
    }

    try {
      await this.invitationService.createInvitation(
        createTenantDto.admin_email,
        Role.AdminDirector,
        targetTenant,
        createTenantDto.admin_first_name,
        createTenantDto.admin_last_name,
      );
      this.logger.log(`[Phase 3] ✅ Admin invitation for '${createTenantDto.admin_email}' sent.`);
    } catch (userError: any) {
      this.logger.error(`[Phase 3] ❌ Failed to send admin invitation: ${userError.message}`);
    }

    // KNOWN tenant → tenant-scoped audit writer (never logSysWrite on this path).
    this.auditService
      .log(
        actor?.id ?? "SYSTEM",
        "TENANT_CREATED",
        targetTenant.tenant_id,
        `Successfully created tenant '${targetTenant.name}' with schema '${targetTenant.schema_name}'.`,
        {
          name: targetTenant.name,
          schema_name: targetTenant.schema_name,
          plan: targetTenant.plan,
          admin_email: createTenantDto.admin_email,
        },
        actor?.email ?? "SYSTEM",
      )
      .catch((err) =>
        this.logger.error(`Failed to log tenant creation success: ${err.message}`),
      );

    return targetTenant;
  }

  /**
   * Persist a FAILED provisioning state so the row survives for audit/retry
   * instead of hanging in PENDING (which would block the schema_name under the
   * unique constraint and evade detection). Never throws.
   */
  private async markProvisioningFailed(tenantId: string, err: unknown): Promise<void> {
    try {
      await this.tenantRepository.update(
        { tenant_id: tenantId },
        {
          provisioning_status: TenantProvisioningStatus.FAILED,
          provisioning_error: err instanceof Error ? err.message : String(err),
        },
      );
      JwtAuthGuard.invalidateTenantStatus(tenantId);
    } catch (persistErr) {
      this.logger.error(
        `Could not persist provisioning failure for tenant ${tenantId}: ${(persistErr as Error).message}`,
      );
    }
  }


  /**
   * Finds all tenants from the public schema.
   */
  async findAllTenants(): Promise<TenantEntity[]> {
    this.logger.log("Attempting to find all tenants...");
    const tenants = await this.tenantRepository.find();
    this.logger.log(`Found ${tenants.length} tenants.`);
    return tenants;
  }

  /**
   * Finds a single tenant by ID from the public schema.
   */
  async findOneTenant(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({
      where: { tenant_id: id },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    return tenant;
  }

  /**
   * Updates a tenant's information in the public schema.
   */
  async updateTenant(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantEntity> {
    // findOneTenant will throw if not found.
    const tenant = await this.findOneTenant(id);

    // Merge and save the changes
    const oldTenant = { ...tenant }; // Snapshot old state for audit
    const updatedTenant = this.tenantRepository.merge(tenant, updateTenantDto);
    const savedTenant = await this.tenantRepository.save(updatedTenant);

    const changes: any = {};
    if (
      updateTenantDto.name !== undefined &&
      oldTenant.name !== savedTenant.name
    ) {
      changes.name = { from: oldTenant.name, to: savedTenant.name };
    }
    if (
      updateTenantDto.is_active !== undefined &&
      oldTenant.is_active !== savedTenant.is_active
    ) {
      changes.is_active = {
        from: oldTenant.is_active,
        to: savedTenant.is_active,
      };
      JwtAuthGuard.invalidateTenantStatus(savedTenant.tenant_id);
    }

    if (Object.keys(changes).length > 0) {
      this.auditService
        .log(
          "SYSTEM",
          "TENANT_UPDATED",
          savedTenant.tenant_id,
          `Tenant '${savedTenant.name}' updated.`,
          { changes },
          "SYSTEM",
        )
        .catch((err) =>
          this.logger.error(`Failed to log tenant update: ${err.message}`),
        );
    }

    return savedTenant;
  }

  /**
   * Updates a tenant's branding information (Logo, Color, Address).
   */
  async updateBranding(
    id: string,
    brandingDto: UpdateTenantBrandingDto,
  ): Promise<TenantEntity> {
    const tenant = await this.findOneTenant(id);

    // Merge and save the changes
    this.tenantRepository.merge(tenant, brandingDto);
    const savedTenant = await this.tenantRepository.save(tenant);

    this.auditService
      .log(
        "SYSTEM",
        "TENANT_BRANDING_UPDATED",
        savedTenant.tenant_id,
        `Tenant '${savedTenant.name}' branding updated.`,
        {},
        "SYSTEM",
      )
      .catch((err) =>
        this.logger.error(
          `Failed to log tenant branding update: ${err.message}`,
        ),
      );

    return savedTenant;
  }

  /**
   * Drops a tenant schema.
   * @param schema_name The name of the schema to drop.
   */
  async dropTenantSchema(schema_name: string): Promise<void> {
    // R1b: schema_name may originate from a DB row (tenants.schema_name) and is
    // therefore not direct user input on this path, but it can still be legacy
    // or tampered. Validate before interpolating into DDL — makes identifier
    // injection impossible regardless of provenance.
    const safeSchema = assertValidSchemaName(schema_name, "drop schema");
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log(`Attempting to drop schema: "${schema_name}"`);
      // We use CASCADE to ensure all tables, types, and constraints within the schema are also dropped.
      // CAUTION: This is a destructive operation.
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${safeSchema}" CASCADE`);
      this.logger.log(`Schema "${schema_name}" dropped successfully.`);
    } catch (error) {
      this.logger.error(
        `Failed to drop schema "${schema_name}": ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to drop tenant schema "${schema_name}".`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Deletes a tenant record from the public schema and drops its associated PostgreSQL schema.
   */
  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { tenant_id: id },
    });

    if (!tenant) {
      // Flaw D (knowable-tenant rule): the row was NOT found, so `id` does not
      // name a live tenant — it must not be written into the tenantId column
      // (RLS WITH CHECK would reject it on a tenant-scoped session, and the
      // .catch() below would swallow the audit row entirely). Route through the
      // SYS path and preserve the attempted id in the targetId column instead.
      this.auditService
        .logSysWrite(
          null,
          "TENANT_DELETION_FAILED",
          `Tenant with ID ${id} not found for deletion.`,
          {
            targetId: id,
            reason: `Tenant with ID ${id} not found for deletion.`,
          },
          "SYSTEM",
        )
        .catch((err) =>
          this.logger.error(
            `Failed to log tenant deletion failure (not found): ${err.message}`,
          ),
        );
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }

    // 1. Drop the schema first. If this fails, we don't delete the record.
    await this.dropTenantSchema(tenant.schema_name);

    // 2. Delete the record from the public tenants table
    const result = await this.tenantRepository.delete({ tenant_id: id });

    if (result.affected === 0) {
      this.auditService
        .log(
          "SYSTEM",
          "TENANT_DELETION_FAILED",
          id,
          `Failed to delete tenant record for ID ${id} after schema drop.`,
          {
            reason: `Failed to delete tenant record for ID ${id} after schema drop.`,
          },
          "SYSTEM",
        )
        .catch((err) =>
          this.logger.error(
            `Failed to log tenant deletion failure (record delete): ${err.message}`,
          ),
        );
      throw new InternalServerErrorException(
        `Failed to delete tenant record for ID ${id}.`,
      );
    }

    this.auditService
      .log(
        "SYSTEM",
        "TENANT_DELETED",
        id,
        `Tenant '${tenant.name}' deleted successfully along with schema '${tenant.schema_name}'.`,
        {
          name: tenant.name,
          schema_name: tenant.schema_name,
          status: "SCHEMA_DROPPED_AND_RECORD_DELETED",
        },
        "SYSTEM",
      )
      .catch((err) =>
        this.logger.error(
          `Failed to log tenant deletion success: ${err.message}`,
        ),
      );
    this.logger.log(
      `Tenant '${tenant.name}' deleted successfully along with schema '${tenant.schema_name}'.`,
    );
  }
}
