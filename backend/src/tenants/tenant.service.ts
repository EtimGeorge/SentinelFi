import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  Logger,
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

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>,
    private readonly dataSource: DataSource,
    private readonly wbsService: WbsService, // Inject WbsService
    private readonly auditService: AuditService, // NEW: Inject AuditService
    private readonly tenantMigrationService: TenantMigrationService, // NEW: Inject TenantMigrationService
    private readonly authService: AuthService, // NEW: Inject AuthService for user creation
    private readonly invitationService: InvitationService, // NEW: Inject InvitationService
  ) {}

  /**
   * Creates a new tenant using a two-phase commit strategy:
   *
   * PHASE 1: Create and commit the PostgreSQL schema
   *  - This makes the schema visible to subsequent connections
   *
   * PHASE 2: Run migrations and save tenant record
   *  - If this fails, the orphaned schema is cleaned up
   *
   * This approach solves the "schema does not exist" error that occurs when
   * TenantMigrationService creates a new DataSource - the schema must be
   * committed before the new connection attempts to use it.
   *
   * @param createTenantDto - The DTO containing the tenant's information.
   * @param initialBudgetFile - Optional file for future AI processing.
   * @returns The newly created TenantEntity.
   */
  async createTenant(
    createTenantDto: CreateTenantDto,
    initialBudgetFile?: Express.Multer.File,
  ): Promise<TenantEntity & { admin_password?: string }> {
    const schema_name = (createTenantDto.schema_name || createTenantDto.name)
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, "_");

    // PRE-FLIGHT CHECK: Verify tenant doesn't exist BEFORE starting any transactions
    // This is more efficient than checking inside a transaction
    const existingTenant = await this.tenantRepository.findOne({
      where: [{ name: createTenantDto.name }, { schema_name }],
    });

    if (existingTenant) {
      this.auditService
        .log(
          null,
          "TENANT_CREATION_FAILED",
          null,
          `Conflicting tenant name or schema name: ${createTenantDto.name}/${schema_name}`,
          {
            requestedName: createTenantDto.name,
            requestedSchemaName: schema_name,
            reason: "Conflict: Tenant or schema name already exists.",
          },
          "SYSTEM",
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

    // ADDITIONAL PRE-FLIGHT: Check if schema already exists from failed previous run
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const schemaCheckResult = await queryRunner.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema_name],
      );

      if (schemaCheckResult.length > 0) {
        this.logger.warn(
          `Schema "${schema_name}" already exists (likely from failed previous run). Dropping it for clean retry...`,
        );
        await this.dropTenantSchema(schema_name);
      }
    } finally {
      await queryRunner.release();
    }

    let schemaCreated = false;

    try {
      // ========== PHASE 1: Create Schema and Commit Immediately ==========
      const schemaQueryRunner = this.dataSource.createQueryRunner();
      await schemaQueryRunner.connect();
      await schemaQueryRunner.startTransaction();

      try {
        this.logger.log(`[Phase 1] Creating schema: ${schema_name}`);
        await schemaQueryRunner.query(
          `CREATE SCHEMA IF NOT EXISTS "${schema_name}"`,
        );

        // CRITICAL: Commit immediately so new DataSource can see the schema
        await schemaQueryRunner.commitTransaction();
        schemaCreated = true;
        this.logger.log(
          `[Phase 1] ✅ Schema "${schema_name}" created and committed.`,
        );
      } catch (schemaError) {
        await schemaQueryRunner.rollbackTransaction();
        this.logger.error(
          `[Phase 1] ❌ Failed to create schema: ${schemaError instanceof Error ? schemaError.message : "Unknown error"}`,
        );
        throw schemaError;
      } finally {
        await schemaQueryRunner.release();
      }

      // ========== PHASE 2: Run Migrations and Save Tenant Record ==========
      try {
        // Run migrations on the newly committed schema
        this.logger.log(
          `[Phase 2] Running migrations for schema: ${schema_name}`,
        );
        await this.tenantMigrationService.runTenantMigrations(schema_name);
        this.logger.log(
          `[Phase 2] ✅ Migrations successfully applied to schema: "${schema_name}"`,
        );

        // Create and save tenant record in a separate transaction
        const tenantQueryRunner = this.dataSource.createQueryRunner();
        await tenantQueryRunner.connect();
        await tenantQueryRunner.startTransaction();

        try {
          const newTenant = tenantQueryRunner.manager.create(TenantEntity, {
            name: createTenantDto.name,
            schema_name: schema_name,
            is_active: createTenantDto.is_active ?? true,
            plan: createTenantDto.plan ?? "basic", // Use provided plan or default
            default_currency_code:
              createTenantDto.default_currency_code ?? "USD",
          });
          const savedTenant = await tenantQueryRunner.manager.save(newTenant);

          // Process initial budget file if provided
          if (initialBudgetFile) {
            this.logger.warn(
              `File processing for '${initialBudgetFile.originalname}' is not yet implemented.`,
            );
            // TODO: Implement AI processing
            // const wbsData = await this.aiService.parseBudget(initialBudgetFile);
            // await this.wbsService.seedWbsDataForTenant(schema_name, wbsData, userId);
          }

          await tenantQueryRunner.commitTransaction();

          // PHASE 3: Invite Initial Admin User (Now that tenant exists)
          this.logger.log(
            `[Phase 3] Inviting initial admin user for tenant '${savedTenant.name}'...`,
          );
          try {
            await this.invitationService.createInvitation(
              createTenantDto.admin_email,
              Role.AdminDirector,
              savedTenant,
              createTenantDto.admin_first_name,
              createTenantDto.admin_last_name,
            );
            this.logger.log(
              `[Phase 3] ✅ Admin invitation for '${createTenantDto.admin_email}' sent successfully.`,
            );
          } catch (userError: any) {
            this.logger.error(
              `[Phase 3] ❌ Failed to send admin invitation: ${userError.message}`,
            );
            // Note: We do NOT rollback schema/tenant here as they are committed.
            // The SuperAdmin can manually trigger another invitation later.
          }

          this.logger.log(
            `[Phase 2] ✅ Successfully created tenant '${savedTenant.name}' with schema '${savedTenant.schema_name}'.`,
          );

          this.auditService
            .log(
              "SYSTEM",
              "TENANT_CREATED",
              savedTenant.tenant_id,
              `Successfully created tenant '${savedTenant.name}' with schema '${savedTenant.schema_name}'.`,
              {
                name: savedTenant.name,
                schema_name: savedTenant.schema_name,
                plan: savedTenant.plan,
                admin_email: createTenantDto.admin_email,
              },
              "SYSTEM",
            )
            .catch((err) =>
              this.logger.error(
                `Failed to log tenant creation success: ${err.message}`,
              ),
            );

          // RETURN the tenant
          return savedTenant;
        } catch (tenantRecordError) {
          await tenantQueryRunner.rollbackTransaction();
          this.logger.error(
            `[Phase 2] ❌ Failed to save tenant record: ${tenantRecordError instanceof Error ? tenantRecordError.message : "Unknown error"}`,
          );
          throw tenantRecordError;
        } finally {
          await tenantQueryRunner.release();
        }
      } catch (phase2Error) {
        // If migrations or tenant record creation fails, clean up the orphaned schema
        this.logger.error(
          `[Phase 2] ❌ Phase 2 failed. Cleaning up orphaned schema "${schema_name}"...`,
        );

        try {
          await this.dropTenantSchema(schema_name);
          this.logger.log(
            `[Cleanup] ✅ Successfully dropped orphaned schema "${schema_name}".`,
          );
        } catch (cleanupError) {
          this.logger.error(
            `[Cleanup] ❌ Failed to clean up schema "${schema_name}": ${cleanupError instanceof Error ? cleanupError.message : "Unknown error"}`,
          );
          // Don't throw cleanup error - the original phase2Error is more important
        }

        throw phase2Error;
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create tenant: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        `Could not create tenant: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log(`Attempting to drop schema: "${schema_name}"`);
      // We use CASCADE to ensure all tables, types, and constraints within the schema are also dropped.
      // CAUTION: This is a destructive operation.
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`);
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
      this.auditService
        .log(
          null,
          "TENANT_DELETION_FAILED",
          id, // Use the ID passed in, as tenant record not found
          `Tenant with ID ${id} not found for deletion.`,
          { reason: `Tenant with ID ${id} not found for deletion.` },
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
