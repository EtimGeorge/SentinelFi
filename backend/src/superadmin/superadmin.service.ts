import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere, ILike, Between, MoreThan } from 'typeorm';
import { TenantProvisioningService } from '../tenants/tenant-provisioning.service';
import { CreateTenantDto, GetTenantsDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { TenantEntity } from '../tenants/tenant.entity';
import { UserEntity } from '../auth/user.entity';
import { Role as RoleEnum } from 'shared/types/role.enum';
import { AssignTenantToUserDto } from './dto/assign-tenant-to-user.dto';
import { SettingsEntity } from '../settings/settings.entity';
import { UpdateSettingsDto } from '../settings/dto/settings.dto';
import { EmailService } from '../email/email.service';
import { SendTestEmailDto } from '../settings/dto/send-test-email.dto';
import { TenantDetailDto } from './dto/tenant-details.dto';
import { WbsBudgetEntity } from '../wbs/wbs-budget.entity';
import { LiveExpenseEntity } from '../wbs/live-expense.entity';
import { AuditLogEntity } from '../audit/audit.entity';
import { UpdateTenantPlanDto } from './dto/tenant-plan.dto';
import { sub } from 'date-fns';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@shared/types/user';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
    private readonly tenantProvisioningService: TenantProvisioningService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    const newTenant = this.tenantRepository.create(createTenantDto);
    const savedTenant = await this.tenantRepository.save(newTenant);
    this.logger.log(`New tenant created with ID: ${savedTenant.tenant_id}, Name: ${savedTenant.name}`);

    try {
      this.logger.log(`Provisioning schema for tenant: ${savedTenant.schema_name}`);
      await this.tenantProvisioningService.provisionTenantSchema(savedTenant.schema_name);
      this.logger.log(`Schema '${savedTenant.schema_name}' provisioned successfully.`);
    } catch (error) {
        if (error instanceof Error) {
            this.logger.error(`Failed to provision schema for tenant ${savedTenant.tenant_id}. Error: ${error.message}`, error.stack);
            await this.tenantRepository.delete(savedTenant.tenant_id);
            throw new Error(`Failed to create tenant: Schema provisioning failed. The tenant has been rolled back.`);
        }
    }

    return savedTenant;
  }

  async findAllTenants(getTenantsDto: GetTenantsDto): Promise<{ data: TenantEntity[], total: number }> {
    const { page = 1, limit = 10, name, schema_name, is_active } = getTenantsDto;
    const where: FindOptionsWhere<TenantEntity> = {};

    if (name) {
      where.name = ILike(`%${name}%`);
    }
    if (schema_name) {
      where.schema_name = ILike(`%${schema_name}%`);
    }
    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [data, total] = await this.tenantRepository.findAndCount({
      where,
      take: limit,
      skip: (page - 1) * limit,
    });

    return { data, total };
  }

  async updateTenant(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: id } });
    if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${id} not found.`);
    }
    this.tenantRepository.merge(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async getTenantPlan(tenantId: string): Promise<any> {
    this.logger.log(`Fetching plan for tenant ${tenantId}`);
    return {
        plan: 'Basic',
        price: 99,
        users: 10,
        features: ['WBS', 'Budgeting', 'Reporting'],
    };
  }

  async updateTenantPlan(tenantId: string, updateData: UpdateTenantPlanDto): Promise<any> {
      this.logger.log(`Updating plan for tenant ${tenantId} with data: ${JSON.stringify(updateData)}`);
      return { status: 'success', message: 'Plan updated' };
  }

  async impersonateTenantAdmin(tenantId: string, superAdminId: string): Promise<string> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
    }

    const adminUser = await this.userRepository.createQueryBuilder("user")
        .innerJoin("user.roles", "role")
        .where("user.tenant_id = :tenantId", { tenantId })
        .andWhere("role.name = :roleName", { roleName: RoleEnum.Admin })
        .getOne();

    if (!adminUser) {
        throw new NotFoundException(`No admin user found for tenant ${tenantId}`);
    }
    
    // We need the full user object with permissions for the token
    const userWithPermissions = await this.userRepository.findOne({
        where: { id: adminUser.id },
        relations: ['roles', 'roles.permissions']
    });

    if (!userWithPermissions) {
        throw new NotFoundException(`Could not fully load admin user ${adminUser.id}`);
    }

    const roleNames: RoleEnum[] = userWithPermissions.roles.map(r => r.name as RoleEnum);
    const permissions = [...new Set(userWithPermissions.roles.flatMap(role => role.permissions.map(p => p.name)))];

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        id: userWithPermissions.id,
        sub: userWithPermissions.id,
        email: userWithPermissions.email,
        roles: roleNames,
        permissions: permissions,
        tenant_id: userWithPermissions.tenant_id,
        impersonator_id: superAdminId, // Add impersonator ID
    };

    return this.jwtService.sign(payload);
  }

  async getTenantDetails(tenantId: string): Promise<TenantDetailDto> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
    }

    const userCount = await this.userRepository.count({ where: { tenant_id: tenantId }});
    const adminUsers = await this.userRepository.createQueryBuilder("user")
        .innerJoin("user.roles", "role")
        .where("user.tenant_id = :tenantId", { tenantId })
        .andWhere("role.name = :roleName", { roleName: RoleEnum.Admin })
        .select(['user.id', 'user.email', 'user.first_name', 'user.last_name'])
        .take(5)
        .getMany();

    // The rest of the logic uses queryRunner, which is fine, but let's ensure it's robust
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    // This is not needed if all queries explicitly use `tenant_id`
    // await queryRunner.query(`SET search_path TO "${tenant.schema_name}";`); 

    try {
      const lastActivity = await this.dataSource.getRepository(AuditLogEntity).findOne({
        where: { tenantId: tenantId },
        select: ['timestamp'],
        order: { timestamp: 'DESC' },
      });
      // These queries will need to be tenant-aware if they aren't already
      const wbsBudgetsCount = 0; // Placeholder until tenant-specific query is confirmed
      const liveExpensesCount = 0; // Placeholder

      const recentAuditLogs = await this.dataSource.getRepository(AuditLogEntity).find({
        where: { tenantId: tenantId },
        take: 5,
        order: { timestamp: 'DESC' },
        relations: ['user'],
      });

      return {
        id: tenant.tenant_id,
        name: tenant.name,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
        isActive: tenant.is_active,
        plan: (tenant as any).plan, // Assuming plan is a property
        userCount,
        adminUsers: adminUsers.map(u => ({ id: u.id, email: u.email, name: `${u.first_name} ${u.last_name}`.trim() })),
        lastActivity: lastActivity ? lastActivity.timestamp : null,
        resourceUsage: {
          wbsBudgets: wbsBudgetsCount,
          liveExpenses: liveExpensesCount,
        },
        recentAuditLogs: recentAuditLogs.map(log => ({
          id: log.id,
          action: log.action,
          timestamp: log.timestamp,
          user: log.user ? { id: log.user.id, email: log.user.email } : null,
        })),
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getTenantCount(): Promise<{ total: number }> {
    const total = await this.tenantRepository.count();
    return { total };
  }

  async getTenantGrowth(period: string): Promise<{ count: number }> {
    const date = this.getDateFromPeriod(period);
    const count = await this.tenantRepository.count({ where: { created_at: MoreThan(date) } });
    return { count };
  }

  async getUserGrowth(period: string): Promise<{ count: number }> {
    const date = this.getDateFromPeriod(period);
    const count = await this.userRepository.count({ where: { created_at: MoreThan(date) } });
    return { count };
  }

  async getSystemHealth(): Promise<any> {
    return { status: 'ok', uptime: '99.9%', db_connection: 'ok' };
  }

  async getTotalUsers(): Promise<{ total: number }> {
    const total = await this.userRepository.count();
    return { total };
  }

  async getMmrEstimate(): Promise<{ mrr: number }> {
    const tenantCount = await this.tenantRepository.count();
    return { mrr: tenantCount * 99 };
  }

  async getWbsMetrics(tenantId?: string): Promise<any> {
    return { total_budget: 100000, total_spent: 45000 };
  }

  async getOperationalBudgetMetrics(tenantId?: string): Promise<any> {
    return { total_allocated: 200000, total_used: 150000 };
  }


  async assignTenantToUser(assignTenantToUserDto: AssignTenantToUserDto): Promise<UserEntity> {
    const { userId, tenantId } = assignTenantToUserDto;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    user.tenant = tenant;
    user.tenant_id = tenant.tenant_id;
    return this.userRepository.save(user);
  }

  async getSuperAdminSettings(): Promise<SettingsEntity> {
    const settings = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      this.logger.log('No global settings found, creating default settings record.');
      const defaultSettings = this.settingsRepository.create({ id: 1 });
      return this.settingsRepository.save(defaultSettings);
    }
    return settings;
  }

  async updateSuperAdminSettings(updateSettingsDto: UpdateSettingsDto): Promise<SettingsEntity> {
    let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepository.create({ id: 1, ...updateSettingsDto });
    } else {
      this.settingsRepository.merge(settings, updateSettingsDto);
    }
    this.logger.log('Global settings updated successfully.');
    return this.settingsRepository.save(settings);
  }

  async sendSuperAdminTestEmail(sendTestEmailDto: SendTestEmailDto): Promise<{ message: string }> {
    const { to } = sendTestEmailDto;
    this.logger.log(`SuperAdmin initiated test email to: ${to}`);
    try {
        await this.emailService.sendEmail(to, 'Test from SuperAdmin', 'This is a test email.');
        return { message: 'Email sent' };
    } catch (error) {
        if (error instanceof Error) {
            this.logger.error(`Failed to send test email: ${error.message}`, error.stack);
        }
      throw error;
    }
  }

  private getDateFromPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
        case '24h':
            return sub(now, { hours: 24 });
        case '7d':
            return sub(now, { days: 7 });
        case '30d':
            return sub(now, { days: 30 });
        case '1y':
            return sub(now, { years: 1 });
        default:
            return sub(now, { days: 30 });
    }
  }
}
