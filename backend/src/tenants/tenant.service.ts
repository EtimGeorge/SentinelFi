import { Injectable, Scope, Inject, InternalServerErrorException, NotFoundException, ConflictException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Repository, ObjectType, EntityManager, ObjectLiteral } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm'; // NEW IMPORT
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { TenantEntity } from './tenant.entity'; // NEW IMPORT
import { CreateTenantDto } from './dto/create-tenant.dto'; // NEW IMPORT
import { UpdateTenantDto } from './dto/update-tenant.dto'; // NEW IMPORT

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  private readonly entityManager: EntityManager;

  constructor(
    @Inject(REQUEST) private request: AuthenticatedRequest,
    @InjectRepository(TenantEntity)
    private tenantRepository: Repository<TenantEntity>, // Inject TenantEntity repository
  ) {
    if (!request.tenantQueryRunner) {
      throw new InternalServerErrorException('Tenant QueryRunner not found on request. Ensure TenantInterceptor is applied and connected.');
    }
    this.entityManager = request.tenantQueryRunner.manager;
  }

  /**
   * Provides a repository scoped to the current tenant's schema.
   * All operations on this repository will automatically use the correct schema.
   */
  getRepository<T extends ObjectLiteral>(entity: ObjectType<T>): Repository<T> {
    return this.entityManager.getRepository(entity);
  }

  /**
   * Provides the EntityManager scoped to the current tenant's schema.
   * Useful for custom queries or operations outside of standard repositories.
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Get the tenantId from the current request context.
   */
  getTenantId(): string {
    if (!this.request.tenantId) {
      throw new InternalServerErrorException('Tenant ID not found in request context.');
    }
    return this.request.tenantId;
  }

  // --- CRUD Stubs for Tenant Management (to satisfy TenantController compilation) ---
  // IMPORTANT: These are STUBS. Full implementation will involve schema creation,
  // migration, file processing, and AI integration.

  async createTenant(createTenantDto: CreateTenantDto, initialBudgetFile?: Express.Multer.File): Promise<TenantEntity> {
    // For now, this is a stub. Full implementation will involve:
    // 1. Validate DTO
    // 2. Create schema_name from name (e.g., lowercase, replace spaces with underscores)
    // 3. Check for existing tenant name or schema_name
    // 4. Create new PostgreSQL schema (e.g., `CREATE SCHEMA "${schemaName}"`)
    // 5. Run migrations on the new schema (using TypeORM's CLI or programmatic migration)
    // 6. Optionally, seed initial data for the new tenant
    // 7. If initialBudgetFile provided, process it (AI parsing, WBS creation)
    // 8. Save the TenantEntity to the public schema
    this.request.tenantId = 'public'; // Temporarily set to public for creating the tenant record itself

    const existingTenant = await this.tenantRepository.findOne({
      where: [{ name: createTenantDto.name }, { schema_name: createTenantDto.name.toLowerCase().replace(/[^a-z0-9]/gi, '_') }],
    });
    if (existingTenant) {
      throw new ConflictException('Tenant with this name or schema already exists.');
    }
    
    const newTenant = this.tenantRepository.create({
      name: createTenantDto.name,
      project_name: createTenantDto.projectName,
      schema_name: createTenantDto.name.toLowerCase().replace(/[^a-z0-9]/gi, '_'), // Basic schema name derivation
    });
    return this.tenantRepository.save(newTenant);
  }

  async findAllTenants(): Promise<TenantEntity[]> {
    this.request.tenantId = 'public'; // Temporarily set to public for reading the tenants list
    return this.tenantRepository.find();
  }

  async findOneTenant(id: string): Promise<TenantEntity> {
    this.request.tenantId = 'public'; // Temporarily set to public for reading the tenants list
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    return tenant;
  }

  async updateTenant(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    this.request.tenantId = 'public'; // Temporarily set to public for updating the tenant record
    const tenant = await this.findOneTenant(id); // Reuses findOneTenant for existence check
    if (updateTenantDto.projectName) {
      tenant.project_name = updateTenantDto.projectName;
    }
    return this.tenantRepository.save(tenant);
  }

  async deleteTenant(id: string): Promise<void> {
    this.request.tenantId = 'public'; // Temporarily set to public for deleting the tenant record
    const result = await this.tenantRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    // Full implementation would also drop the tenant's PostgreSQL schema and associated users
  }
}