import { Injectable, InternalServerErrorException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantEntity } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { WbsService } from '../wbs/wbs.service'; // For seeding data

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>,
    private readonly dataSource: DataSource,
    private readonly wbsService: WbsService, // Inject WbsService
  ) {}

  /**
   * Creates a new tenant, which involves:
   * 1. Creating a new PostgreSQL schema for the tenant.
   * 2. Saving the tenant's metadata to the public 'tenants' table.
   * This all happens within a single database transaction.
   * @param createTenantDto - The DTO containing the tenant's information.
   * @param initialBudgetFile - Optional file for future AI processing.
   * @returns The newly created TenantEntity.
   */
  async createTenant(createTenantDto: CreateTenantDto, initialBudgetFile?: Express.Multer.File): Promise<TenantEntity> {
    const schema_name = createTenantDto.name.toLowerCase().replace(/[^a-z0-9_]/gi, '_');

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
        throw new ConflictException('Tenant with this name or a conflicting schema name already exists.');
      }

      // 2. Create the new schema
      this.logger.log(`Creating schema: ${schema_name}`);
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);

      // 3. TODO: Run migrations on the new schema. This is a complex step.
      // For now, we assume the tables are created by other means or will be handled
      // by a separate migration strategy. A robust solution would use `dataSource.runMigrations()`.
      this.logger.warn(`Migrations for schema '${schema_name}' are not being run automatically. This must be handled.`);

      // 4. Create and save the tenant entity to the public schema
      const newTenant = queryRunner.manager.create(TenantEntity, {
        name: createTenantDto.name,
        project_name: createTenantDto.projectName,
        schema_name: schema_name,
      });
      const savedTenant = await queryRunner.manager.save(newTenant);
      
      // 5. TODO: Process `initialBudgetFile` with AI and seed data
      if (initialBudgetFile) {
        this.logger.warn(`File processing for '${initialBudgetFile.originalname}' is not yet implemented.`);
        // Example of how it would work:
        // const wbsData = await this.aiService.parseBudget(initialBudgetFile);
        // await this.wbsService.seedWbsDataForTenant(schema_name, wbsData, /* userId */);
      }

      // If we get this far without errors, commit the transaction
      await queryRunner.commitTransaction();
      this.logger.log(`Successfully created tenant '${savedTenant.name}' with schema '${savedTenant.schema_name}'.`);
      return savedTenant;

    } catch (error: unknown) { // Explicitly type error as unknown
      // If any step fails, roll back the entire transaction
      this.logger.error(`Failed to create tenant: ${(error instanceof Error ? error.message : 'Unknown error')}`, (error instanceof Error ? error.stack : undefined));
      await queryRunner.rollbackTransaction();
      // Re-throw the original error or a generic one
      throw new InternalServerErrorException(`Could not create tenant: ${(error instanceof Error ? error.message : 'Unknown error')}`);
    } finally {
      // VERY IMPORTANT: Always release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Finds all tenants from the public schema.
   */
  async findAllTenants(): Promise<TenantEntity[]> {
    // This now correctly uses the injected repository which points to the public schema.
    return this.tenantRepository.find();
  }

  /**
   * Finds a single tenant by ID from the public schema.
   */
  async findOneTenant(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    return tenant;
  }

  /**
   * Updates a tenant's information in the public schema.
   */
  async updateTenant(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    // findOneTenant will throw if not found.
    const tenant = await this.findOneTenant(id);
    
    // Merge and save the changes
    const updatedTenant = this.tenantRepository.merge(tenant, updateTenantDto);
    return this.tenantRepository.save(updatedTenant);
  }

  /**
   * Deletes a tenant record from the public schema.
   * A robust implementation should also drop the tenant's schema.
   */
  async deleteTenant(id: string): Promise<void> {
    // TODO: Implement logic to drop the schema ("DROP SCHEMA...") in a transaction.
    // This is a destructive operation and should be handled with care.
    this.logger.warn(`Schema dropping for tenant ${id} is not yet implemented.`);

    const result = await this.tenantRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
  }
}