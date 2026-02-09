import { Injectable, Logger, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere, ILike, Between, MoreThan, IsNull } from 'typeorm';
import { TenantService } from '../tenants/tenant.service';
import { CreateTenantDto, GetTenantsDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { TenantEntity } from '../tenants/tenant.entity';
import { UserEntity } from '../auth/user.entity';
import { Role } from 'shared/types/role.enum';
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
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import * as os from 'os';
import * as bcrypt from 'bcryptjs';



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
    private readonly tenantService: TenantService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    // Delegate to the specialized TenantService which handles schema creation and migrations
    return this.tenantService.createTenant(createTenantDto);
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
    
    // Default to excluding soft-deleted tenants
    where.deleted_at = IsNull();

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

  async getTenantPlan(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ 
      where: { tenant_id: tenantId },
      select: ['tenant_id', 'name', 'plan', 'max_users', 'max_storage_gb', 'expires_at', 'price', 'is_active']
    });
    
    if (!tenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
    }
    return tenant;
  }

  async updateTenantPlan(tenantId: string, updateData: UpdateTenantPlanDto): Promise<TenantEntity> {
      const tenant = await this.tenantRepository.findOne({ where: { tenant_id: tenantId } });
      if (!tenant) {
          throw new NotFoundException(`Tenant with ID ${tenantId} not found.`);
      }
      
      
      // Map DTO plan_name to entity plan if provided
      if (updateData.plan_name) {
          (tenant as any).plan = updateData.plan_name;
          delete updateData.plan_name;
      }

      this.tenantRepository.merge(tenant, updateData);
      const saved = await this.tenantRepository.save(tenant);
      
      this.auditService.log(
          "SYSTEM",
          "TENANT_PLAN_UPDATED",
          tenantId,
          `Subscription plan updated for ${tenant.name}`,
          { updateData },
          "SYSTEM"
      ).catch(() => {});

      return saved;
  }

  async impersonateUser(userId: string, superAdminId: string): Promise<string> {
    // 1. Validate the user to be impersonated
    const userToImpersonate = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'tenant'], // Eager load relations for payload
    });

    if (!userToImpersonate) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    // Prevent SuperAdmin from impersonating another SuperAdmin (security measure)
    const isImpersonatedUserSuperAdmin = userToImpersonate.roles.some(
      (role) => role.name === Role.SuperAdmin,
    );
    if (isImpersonatedUserSuperAdmin) {
      throw new UnauthorizedException('Cannot impersonate another SuperAdmin.');
    }

    // 2. Generate JWT payload for the impersonated user
    const roleNames: Role[] = userToImpersonate.roles.map(
      (r) => r.name as Role,
    );
    const permissions = [
      ...new Set(
        userToImpersonate.roles.flatMap((role) =>
          role.permissions.map((p) => p.name),
        ),
      ),
    ];

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      id: userToImpersonate.id,
      sub: userToImpersonate.id,
      email: userToImpersonate.email,
      roles: roleNames,
      permissions: permissions,
      tenant_id: userToImpersonate.tenant_id,
      impersonator_id: superAdminId, // IMPORTANT: Store the SuperAdmin's ID for audit
    };

    // 3. Generate the token using AuthService - strictly limited to 30 minutes for security
    const impersonationToken = await this.authService.generateJwtToken(payload, { expiresIn: '1800s' });

    // 4. Log the impersonation action
    this.auditService.log(
      superAdminId,
      'IMPERSONATION_STARTED',
      userToImpersonate.tenant_id,
      `SuperAdmin (ID: ${superAdminId}) impersonated user (ID: ${userId}, Email: ${userToImpersonate.email})`,
      {
        targetUserId: userToImpersonate.id,
        impersonatedUserEmail: userToImpersonate.email,
      },
      superAdminId, // Acting user email (SuperAdmin's email, or ID as placeholder)
    ).catch(err => this.logger.error(`Failed to log impersonation start: ${err.message}`));

    this.logger.log(
      `SuperAdmin (ID: ${superAdminId}) impersonated user (ID: ${userId}, Email: ${userToImpersonate.email})`,
    );

    return impersonationToken;
  }

  async stopImpersonation(superAdminId: string, impersonatedUserId: string): Promise<void> {
    this.auditService.log(
      superAdminId,
      'IMPERSONATION_ENDED',
      null, // Tenant ID for SuperAdmin stopping impersonation (platform-level)
      `SuperAdmin (ID: ${superAdminId}) ended impersonation of user (ID: ${impersonatedUserId})`,
      {
        impersonatedUserId: impersonatedUserId,
      },
      superAdminId, // Acting user email (SuperAdmin's email, or ID as placeholder)
    ).catch(err => this.logger.error(`Failed to log impersonation end: ${err.message}`));
    this.logger.log(`SuperAdmin (ID: ${superAdminId}) ended impersonation of user (ID: ${impersonatedUserId})`);
  }

  async impersonateTenant(tenantId: string, superAdminId: string): Promise<string> {
    // 1. Find the admin user for this tenant
    const adminUser = await this.userRepository.findOne({
      where: { 
        tenant_id: tenantId,
        roles: {
          name: Role.Admin
        }
      },
      relations: ['roles']
    });

    if (!adminUser) {
      throw new NotFoundException(`No Admin user found for tenant ${tenantId}`);
    }

    // 2. Delegate to the user impersonation logic
    return this.impersonateUser(adminUser.id, superAdminId);
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
        .andWhere("role.name = :roleName", { roleName: Role.Admin })
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
        recentAuditLogs: recentAuditLogs.map((log: AuditLogEntity) => ({
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

  async getTenantCount(): Promise<{ total: number; active: number }> {
    const total = await this.tenantRepository.count();
    const active = await this.tenantRepository.count({ where: { is_active: true } });
    return { total, active };
  }

  async getTenantGrowth(period: string): Promise<{ date: string; count: number }[]> {
    const startDate = this.getDateFromPeriod(period);
    
    // Group by date (assuming PostgreSQL, use partial string match or date_trunc)
    // Adjust syntax based on specific DB (using generic SQL standard here for safety or TypeORM abstraction)
    
    const result = await this.tenantRepository
      .createQueryBuilder('tenant')
      .select("TO_CHAR(tenant.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(tenant.tenant_id)', 'count')
      .where('tenant.created_at > :startDate', { startDate })
      .groupBy("TO_CHAR(tenant.created_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Fill in missing dates for smoother charts
    return this.fillMissingDates(result, startDate, new Date());
  }

  // Helper to fill zero-value dates
  private fillMissingDates(data: { date: string; count: string }[], start: Date, end: Date) {
    const filled = [];
    const current = new Date(start);
    const dataMap = new Map(data.map(item => [item.date, parseInt(item.count)]));

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      filled.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0
      });
      current.setDate(current.getDate() + 1);
    }
    return filled;
  }

  async getUserGrowth(period: string): Promise<{ count: number }> {
    const date = this.getDateFromPeriod(period);
    const count = await this.userRepository.count({ where: { created_at: MoreThan(date) } });
    return { count };
  }

  async getSystemHealth(): Promise<any> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);
    
    // Simple CPU usage approximation (average of load levels)
    const cpus = os.cpus();
    const load = os.loadavg();
    const cpuUsage = Math.round((load[0] / cpus.length) * 100);

    const uptimeSeconds = os.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeDays = Math.floor(uptimeHours / 24);
    const uptimeStr = uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours % 24}h` : `${uptimeHours}h`;

    return { 
      status: 'ok', 
      uptime: uptimeStr, 
      cpu: Math.min(cpuUsage, 100), 
      memory: memoryUsage,
      dbConnections: (this.dataSource.driver as any).master?.totalCount || 0
    };
  }

  async getTotalUsers(): Promise<{ total: number }> {
    const total = await this.userRepository.count();
    return { total };
  }

  async getMmrEstimate(): Promise<{ mrrEstimate: number }> {
    const pricingMap: Record<string, number> = {
      'basic': 99,
      'premium': 249,
      'enterprise': 999
    };
    
    const tenants = await this.tenantRepository.find({ select: ['plan', 'price', 'is_active'] });
    const total = tenants.reduce((acc, t) => {
      if (!t.is_active) return acc;
      const price = Number(t.price);
      if (price > 0) return acc + price;
      return acc + (pricingMap[t.plan?.toLowerCase()] || 0);
    }, 0);
    
    return { mrrEstimate: total };
  }

  async getWbsMetrics(tenantId?: string): Promise<any> {
    if (tenantId) {
      // Logic for single tenant if needed
      return { total_budget: 0, total_spent: 0 };
    }

    const tenants = await this.tenantRepository.find({ where: { is_active: true } });
    
    // Execute all tenant metric queries in parallel to respect the timeout
    const metricResults = await Promise.all(
      tenants.map(async (tenant) => {
        try {
          const metrics = await this.dataSource.query(`
            SELECT 
              COALESCE(SUM(total_cost_budgeted), 0) as budget,
              (SELECT COALESCE(SUM(amount), 0) FROM "${tenant.schema_name}"."live_expense") as spent
            FROM "${tenant.schema_name}"."wbs_budget"
          `);
          return {
            budget: Number(metrics[0]?.budget || 0),
            spent: Number(metrics[0]?.spent || 0)
          };
        } catch (err) {
          this.logger.warn(`Failed to fetch WBS metrics for tenant ${tenant.name} (${tenant.schema_name})`);
          return { budget: 0, spent: 0 };
        }
      })
    );

    const totalBudget = metricResults.reduce((acc, curr) => acc + curr.budget, 0);
    const totalSpent = metricResults.reduce((acc, curr) => acc + curr.spent, 0);

    return { total_budget: totalBudget, total_spent: totalSpent };
  }

  async getOperationalBudgetMetrics(tenantId?: string): Promise<any> {
     // Advanced multi-tenant aggregation for operational budgets
     const tenants = await this.tenantRepository.find({ where: { is_active: true } });
     
     // Parallel execution for operational metrics
     const results = await Promise.all(
       tenants.map(async (tenant) => {
         try {
           const metrics = await this.dataSource.query(`
             SELECT 
                COALESCE(SUM(budgeted_amount), 0) as allocated,
                COALESCE(SUM(actual_spent), 0) as used,
                COUNT(operational_budget_id) as count
             FROM "${tenant.schema_name}"."operational_budget"
           `);
           return {
             allocated: Number(metrics[0]?.allocated || 0),
             used: Number(metrics[0]?.used || 0),
             count: Number(metrics[0]?.count || 0)
           };
         } catch (err) {
           return { allocated: 0, used: 0, count: 0 };
         }
       })
     );

     const totalAllocated = results.reduce((acc, curr) => acc + curr.allocated, 0);
     const totalUsed = results.reduce((acc, curr) => acc + curr.used, 0);
     const budgetCount = results.reduce((acc, curr) => acc + curr.count, 0);

     return { 
        totalBudgets: budgetCount,
        totalBudgetAmount: totalAllocated,
        totalActualSpent: totalUsed,
        averageBudgetUtilization: totalAllocated > 0 ? (totalUsed / totalAllocated) : 0
     };
  }

  async getPlanDistribution(): Promise<any[]> {
    const tenants = await this.tenantRepository.find();
    const distribution: Record<string, number> = {};
    
    tenants.forEach(t => {
      const planValue = (t as any).plan || 'Free';
      const label = planValue.charAt(0).toUpperCase() + planValue.slice(1);
      distribution[label] = (distribution[label] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }

  async getBillingOverview(): Promise<any> {
    const tenants = await this.tenantRepository.find();
    const activeTenants = tenants.filter(t => t.is_active);
    const totalMrr = activeTenants.reduce((acc, t) => acc + parseFloat(t.price as any || 0), 0);
    
    return {
      overview: {
        totalMrr,
        activeSubscriptions: activeTenants.length,
        pendingInvoices: 0, // In real world, query an Invoices table
        mrrGrowthPercentage: 12.5, // Placeholder for trend logic
        subscriptionGrowthPercentage: 8.2
      }
    };
  }

  async getRecentInvoices(): Promise<any[]> {
    // Generate virtual invoices based on tenants for demonstration 
    // or query real ones if table exists.
    const tenants = await this.tenantRepository.find({ take: 5, order: { created_at: 'DESC' } });
    return tenants.map(t => ({
      id: `INV-${t.tenant_id.split('-')[0].toUpperCase()}`,
      tenantName: t.name,
      amount: parseFloat(t.price as any || 99),
      date: t.created_at,
      status: 'paid'
    }));
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

  // --- NEW TENANT MANAGEMENT ACTIONS ---

  async softDeleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ where: { tenant_id: tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found.`);

    if (tenant.deleted_at) {
        throw new ConflictException(`Tenant ${tenant.name} is already archived.`);
    }

    tenant.deleted_at = new Date();
    tenant.is_active = false; // Disable access immediately
    await this.tenantRepository.save(tenant);

    this.logger.log(`Tenant ${tenant.name} (${tenantId}) archived by SuperAdmin.`);
    
    await this.auditService.log(
        "SYSTEM",
        "TENANT_ARCHIVED",
        tenantId,
        `Tenant ${tenant.name} was moved to archival state (soft-deleted).`,
        { tenant_name: tenant.name },
        "SYSTEM"
    ).catch(() => {});
  }

  async resetTenantAdminPassword(tenantId: string, resetDto: any): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ 
        where: { tenant_id: tenantId },
        relations: ['users', 'users.roles'] 
    });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found.`);

    const adminUser = tenant.users.find(u => u.roles.some(r => r.name === Role.Admin));
    if (!adminUser) throw new NotFoundException('No Admin user found for this tenant.');

    // 1. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(resetDto.newPassword, salt);

    // 2. Update user
    adminUser.password_hash = hashedPassword;
    await this.userRepository.save(adminUser);

    this.logger.log(`Forced password reset for Tenant Admin ${adminUser.email} (Tenant: ${tenant.name})`);

    // 3. Notify the user
    await this.emailService.sendEmail(
        adminUser.email,
        'Security Alert: Password Reset by Platform Administrator',
        `<p>Your account password for <strong>${tenant.name}</strong> has been reset by the platform SuperAdmin.</p>
         <p><strong>Reason:</strong> ${resetDto.reason}</p>
         <p>If you did not expect this, please contact support immediately.</p>`
    ).catch(err => this.logger.error(`Failed to send reset notification: ${err.message}`));

    // 4. Audit Log
    await this.auditService.log(
        "SYSTEM",
        "TENANT_ADMIN_PASSWORD_RESET",
        adminUser.id,
        "SuperAdmin forced a password reset for a tenant administrator.",
        { tenantId, reason: resetDto.reason },
        "SYSTEM"
    ).catch(() => {});
  }

  // --- SUPERADMIN SELF-MANAGEMENT ---

  async updateSuperAdminProfile(userId: string, updateDto: any): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ 
        where: { id: userId },
        relations: ['roles'],
        select: ['id', 'email', 'password_hash', 'first_name', 'last_name', 'is_active', 'tenant_id']
    });
    if (!user) throw new NotFoundException('SuperAdmin user not found.');

    // Security: Check current password if sensitive fields are changing
    if (updateDto.email || updateDto.newPassword) {
        if (!updateDto.currentPassword) {
            throw new UnauthorizedException('Current password required to change email or password.');
        }
        const isMatch = await bcrypt.compare(updateDto.currentPassword, (user as any).password_hash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid current password.');
        }
    }

    if (updateDto.email) user.email = updateDto.email;
    if (updateDto.firstName) user.first_name = updateDto.firstName;
    if (updateDto.lastName) user.last_name = updateDto.lastName;
    
    if (updateDto.newPassword) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(updateDto.newPassword, salt);
    }

    const saved = await this.userRepository.save(user);

    await this.auditService.log(
        user.id,
        "SUPERADMIN_PROFILE_UPDATED",
        user.id,
        "SuperAdmin updated their own profile settings.",
        { changedFields: Object.keys(updateDto).filter(k => k !== 'currentPassword' && k !== 'newPassword') },
        user.email
    ).catch(() => {});

    return saved;
  }
}
