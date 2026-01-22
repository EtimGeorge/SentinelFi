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
} from "../superadmin/dto/create-tenant.dto";
import { WbsService } from "../wbs/wbs.service"; // For seeding data
import { AuditService } from "../audit/audit.service"; // NEW: Import AuditService
import { TenantMigrationService } from "../database/tenant-migration.service"; // NEW: Import TenantMigrationService

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
  ) {}

  /**
   * Creates a new tenant, which involves:
   * 1. Creating a new PostgreSQL schema for the tenant.
   * 2. Saving the tenant's metadata to the public 'tenants' table.
   * 3. Running tenant-specific migrations on the new schema.
   * This all happens within a single database transaction.
   * @param createTenantDto - The DTO containing the tenant's information.
   * @param initialBudgetFile - Optional file for future AI processing.
   * @returns The newly created TenantEntity.
   */
  async createTenant(
    createTenantDto: CreateTenantDto,
    initialBudgetFile?: Express.Multer.File,
  ): Promise<TenantEntity> {
    const schema_name = createTenantDto.name
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, "_");

    // Use a single query runner for the entire transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check for existing tenant name or schema_name in the public table
      const existingTenant = await queryRunner.manager.findOne(TenantEntity, {
        where: [{ name: createTenantDto.name }, { schema_name }],
      });
      if (existingTenant) {
        await this.auditService.logEvent({
          action: "TENANT_CREATION_FAILED",
          userEmail: "SYSTEM", // Assuming system initiated or passed from SuperAdmin context
          details: {
            reason: `Conflicting tenant name or schema name: ${createTenantDto.name}/${schema_name}`,
          },
        });
        throw new ConflictException(
          "Tenant with this name or a conflicting schema name already exists.",
        );
      }

      // 2. Create the new schema
      this.logger.log(`Creating schema: ${schema_name}`);
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);

      // 3. Run migrations on the new schema
      await this.tenantMigrationService.runTenantMigrations(schema_name);
      this.logger.log(
        `Migrations successfully applied to new schema: "${schema_name}"`,
      );

      // 4. Create and save the tenant entity to the public schema
      const newTenant = queryRunner.manager.create(TenantEntity, {
        name: createTenantDto.name,
        schema_name: schema_name,
        is_active: createTenantDto.is_active ?? true, // Set is_active from DTO or default
      });
      const savedTenant = await queryRunner.manager.save(newTenant);

      // 5. TODO: Process `initialBudgetFile` with AI and seed data
      if (initialBudgetFile) {
        this.logger.warn(
          `File processing for '${initialBudgetFile.originalname}' is not yet implemented.`,
        );
        // Example of how it would work:
        // const wbsData = await this.aiService.parseBudget(initialBudgetFile);
        // await this.wbsService.seedWbsDataForTenant(schema_name, wbsData, /* userId */);
      }

      // If we get this far without errors, commit the transaction
      await queryRunner.commitTransaction();
      this.logger.log(
        `Successfully created tenant '${savedTenant.name}' with schema '${savedTenant.schema_name}'.`,
      );

      await this.auditService.logEvent({
        action: "TENANT_CREATED",
        userId: "SYSTEM", // Assuming system initiated or passed from SuperAdmin context
        targetType: "TENANT",
        targetId: savedTenant.tenant_id,
        details: {
          name: savedTenant.name,
          schema_name: savedTenant.schema_name,
        },
      });
      return savedTenant;
    } catch (error: unknown) {
      // Explicitly type error as unknown
      // If any step fails, roll back the entire transaction
      this.logger.error(
        `Failed to create tenant: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      await queryRunner.rollbackTransaction();
      // Re-throw the original error or a generic one
      throw new InternalServerErrorException(
        `Could not create tenant: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      // VERY IMPORTANT: Always release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Finds all tenants from the public schema.
   */
  async findAllTenants(): Promise<TenantEntity[]> {
    this.logger.log("Attempting to find all tenants...");
    const tenants = await this.tenantRepository.find();
    this.logger.log(
      `Found ${tenants.length} tenants. Data: ${JSON.stringify(tenants)}`,
    );
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
      await this.auditService.logEvent({
        action: "TENANT_UPDATED",
        userId: "SYSTEM", // Assuming system initiated or passed from SuperAdmin context
        targetType: "TENANT",
        targetId: savedTenant.tenant_id,
        details: { changes },
      });
    }

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
      await this.auditService.logEvent({
        action: "TENANT_DELETION_FAILED",
        userEmail: "SYSTEM",
        details: { reason: `Tenant with ID ${id} not found for deletion.` },
      });
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }

    // 1. Drop the schema first. If this fails, we don't delete the record.
    await this.dropTenantSchema(tenant.schema_name);

    // 2. Delete the record from the public tenants table
    const result = await this.tenantRepository.delete({ tenant_id: id });
    
    if (result.affected === 0) {
      await this.auditService.logEvent({
        action: "TENANT_DELETION_FAILED",
        userEmail: "SYSTEM",
        targetType: "TENANT",
        targetId: id,
        details: { reason: `Failed to delete tenant record for ID ${id} after schema drop.` },
      });
      throw new InternalServerErrorException(
        `Failed to delete tenant record for ID ${id}.`,
      );
    }

    await this.auditService.logEvent({
      action: "TENANT_DELETED",
      userId: "SYSTEM",
      targetType: "TENANT",
      targetId: id,
      details: { name: tenant.name, schema_name: tenant.schema_name, status: 'SCHEMA_DROPPED_AND_RECORD_DELETED' },
    });

    this.logger.log(`Tenant '${tenant.name}' deleted successfully along with schema '${tenant.schema_name}'.`);
  }
}
