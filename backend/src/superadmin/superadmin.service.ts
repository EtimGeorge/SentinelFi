import { Injectable, ConflictException, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantEntity } from '../tenants/tenant.entity';
import { CreateTenantDto, UpdateTenantDto, GetTenantsDto } from './dto/create-tenant.dto'; // Using combined DTO file for now
import { AuthService } from '../auth/auth.service'; // To create the initial tenant admin user
import { CreateUserDto } from 'shared/types/user'; // DTO for creating user
import { Role } from 'shared/types/role.enum'; // NEW: Import Role enum 
import { CreateTenantAdminUserDto } from './dto/create-tenant-admin-user.dto'; // NEW: Import new DTO
import { TenantProvisioningService } from '../tenants/tenant-provisioning.service'; // NEW: Import TenantProvisioningService

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>,
    private authService: AuthService,
    private dataSource: DataSource, // Inject DataSource for manual schema management
    private tenantProvisioningService: TenantProvisioningService, // NEW: Inject TenantProvisioningService
  ) {}

  /**
   * Creates a new tenant, its dedicated database schema, and an initial admin user.
   * This is a critical SuperAdmin operation.
   * @param createTenantDto Data for creating the tenant.
   * @returns The created TenantEntity.
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantEntity & { admin_password?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check if schema_name or tenant name already exists
      const existingTenantByName = await queryRunner.manager.findOne(TenantEntity, { where: { name: createTenantDto.name } });
      if (existingTenantByName) {
        throw new ConflictException(`Tenant with name '${createTenantDto.name}' already exists.`);
      }
      const existingTenantBySchema = await queryRunner.manager.findOne(TenantEntity, { where: { schema_name: createTenantDto.schema_name } });
      if (existingTenantBySchema) {
        throw new ConflictException(`Tenant with schema name '${createTenantDto.schema_name}' already exists.`);
      }

      // 2. Create and Provision the database schema with tables and types
      await this.tenantProvisioningService.provisionTenantSchema(createTenantDto.schema_name);
      this.logger.log(`Tenant schema "${createTenantDto.schema_name}" provisioned with tables and types.`);

      // 3. Create the tenant record in the public schema
      const newTenant = this.tenantRepository.create(createTenantDto);
      const savedTenant = await queryRunner.manager.save(TenantEntity, newTenant);
      this.logger.log(`Tenant record '${savedTenant.name}' saved with ID '${savedTenant.tenant_id}'.`);

      // 4. (Removed placeholder comments as provisioning is now handled by TenantProvisioningService)

      // 5. Create the initial admin user for this tenant
      const createAdminUserDto: CreateTenantAdminUserDto = {
        email: createTenantDto.admin_email,

        role: Role.Admin, // Assign 'Admin' role
        tenant_id: savedTenant.tenant_id,
        first_name: 'Tenant', // Default first name
        last_name: 'Admin', // Default last name
      };
      const initialAdminUser = await this.authService.createTenantUser(createAdminUserDto); 
      this.logger.log(`Initial admin user '${initialAdminUser.email}' created for tenant '${savedTenant.name}'.`);
      // IMPORTANT: The generated password is logged as a WARNING in auth.service.ts.
      // For production, this password should be securely transmitted (e.g., via email service)
      // and NOT returned directly in the API response or logs.
      // For development/testing, returning it here is acceptable.

      await queryRunner.commitTransaction();
      
      // Return the saved tenant along with the generated admin password
      return { ...savedTenant, admin_password: initialAdminUser.generatedPassword };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create tenant '${createTenantDto.name}' or schema '${createTenantDto.schema_name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined
      );
      // If schema creation failed but tenant record didn't exist, we might need a cleanup.
      // For a partial failure (e.g., schema created, but user creation failed),
      // we might need to rollback schema as well or have a cleanup utility.
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create tenant due to an internal server error.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Finds all tenants with pagination and filtering.
   * @param getTenantsDto Filtering and pagination options.
   * @returns A paginated list of TenantEntity.
   */
  async findAllTenants(getTenantsDto: GetTenantsDto): Promise<{ tenants: TenantEntity[]; total: number }> {
    const { page = 1, limit = 10, name, schema_name, is_active } = getTenantsDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    if (name) {
      queryBuilder.andWhere('tenant.name ILIKE :name', { name: `%${name}%` });
    }
    if (schema_name) {
      queryBuilder.andWhere('tenant.schema_name ILIKE :schema_name', { schema_name: `%${schema_name}%` });
    }
    if (is_active !== undefined) {
      queryBuilder.andWhere('tenant.is_active = :is_active', { is_active });
    }

    const [tenants, total] = await queryBuilder
      .orderBy('tenant.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { tenants, total };
  }

  /**
   * Updates an existing tenant.
   * @param id The ID of the tenant to update.
   * @param updateTenantDto Data for updating the tenant.
   * @returns The updated TenantEntity.
   */
  async updateTenant(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }

    // Prevent changing schema_name after creation, as it's foundational
    if (updateTenantDto.schema_name && updateTenantDto.schema_name !== tenant.schema_name) {
      throw new BadRequestException('Changing the schema_name of an existing tenant is not allowed.');
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  /**
   * Finds a single tenant by ID.
   * @param id The ID of the tenant to find.
   * @returns The TenantEntity.
   */
  async findOneTenant(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${id}' not found.`);
    }
    return tenant;
  }
}