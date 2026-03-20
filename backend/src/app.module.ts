import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Logger,
} from "@nestjs/common";
import { TenancyGuard } from "./common/guards/tenancy.guard";
import { TenantAccessGuard } from "./common/guards/tenant-access.guard"; // Import TenantAccessGuard
import { ClsModule, ClsService } from "nestjs-cls";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import { TenancyAwareDataSource } from "./database/tenancy-aware-data-source";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CorrelationInterceptor } from "./common/interceptors/correlation.interceptor";
import { WbsBudgetEntity } from "./wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "./wbs/live-expense.entity";
import { WbsModule } from "./wbs/wbs.module";
import { AuthModule } from "./auth/auth.module";
import { UserEntity } from "./auth/user.entity";
import { RoleEntity } from "./auth/role.entity"; // Import RoleEntity
import { PermissionEntity } from "./auth/permission.entity"; // Import PermissionEntity
import { WbsCategoryEntity } from "./wbs/wbs-category.entity";
import { TenantModule } from "./tenants/tenant.module";
import { TenantEntity } from "./tenants/tenant.entity";
import { SearchModule } from "./search/search.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { AuditModule } from "./audit/audit.module";
import { AuditLogEntity } from "./audit/audit.entity";
import { ProjectEntity } from "./projects/project.entity";
import { LpoEntity } from "./projects/lpo.entity";
import { ProjectInflowEntity } from "./projects/project-inflow.entity";
import { ProjectAuditEntity } from "./projects/project-audit.entity";
import { ProjectsModule } from "./projects/projects.module";
import { OperationalBudgetEntity } from "./operational-budgets/operational-budget.entity";
import { OperationalBudgetsModule } from "./operational-budgets/operational-budgets.module";
import { OperationalBudgetCategoryEntity } from "./operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "./operational-budgets/operational-expense.entity";
import { SuperAdminModule } from "./superadmin/superadmin.module";
import { BillingModule } from "./billing/billing.module";
import { SettingsModule } from "./settings/settings.module";
import { SettingsEntity } from "./settings/settings.entity";
import { EmailModule } from "./email/email.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { TenantDatabaseModule } from "./database/tenant-database.module";
import { TenantMigrationModule } from "./database/tenant-migration.module";
import { CommonModule } from "./common/common.module";
import { DatabaseConfig } from "./common/config/database.config";
import { PayrollEntryEntity } from "./operational-budgets/payroll-entry.entity";
import { TenantRepositoriesModule } from "./tenant-repositories.module"; // Import TenantRepositoriesModule
import { BudgetCategoryEntity } from "./operational-budgets/budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity } from "./operational-budgets/operational-budget-period-allocation.entity";
import { CurrencyModule } from "./currency/currency.module";
import { CurrencyExchangeRateEntity } from "./currency/currency.entity";
import { ClientModule } from "./clients/client.module";
import { ClientEntity } from "./clients/client.entity";
import { FinanceCoreModule } from "./finance-core/finance-core.module";
import { ReportingModule } from "./reporting/reporting.module";
import { MessagingModule } from "./messaging/messaging.module";
import { AiAssistantModule } from "./ai-assistant/ai-assistant.module";
import { ReportScheduleEntity } from "./ai-assistant/report-schedule.entity";
import { MarketingModule } from "./marketing/marketing.module";
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LogSanitizationInterceptor } from './common/interceptors/log-sanitization.interceptor';
import { HealthModule } from './health/health.module';
import { envValidationSchema } from './common/config/env-validation.schema';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env", "backend/.env.local", "backend/.env"],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          url: `redis://${configService.get('REDIS_HOST') || 'localhost'}:${configService.get('REDIS_PORT') || 6379}`,
          ttl: 600, // 10 minutes default
        }),
      }),
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, ClsModule],
      inject: [ConfigService, ClsService],
      useFactory: (configService: ConfigService) => {
        const entities = DatabaseConfig.getEntities();
        // Use a unified pool for the entire application (5 connections).
        // Combined with the tenant pool (5), this stays within Neon safe limits (10).
        return DatabaseConfig.getTypeOrmConfig(configService, entities, 5);
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('DataSource options are undefined');
        }
        const dataSource = new TenancyAwareDataSource(options as DataSourceOptions);
        return dataSource;
      }
    }),
    TenantDatabaseModule, // Add the TenantDatabaseModule here
    TenantMigrationModule, // NEW: Add TenantMigrationModule
    TenantRepositoriesModule, // Add TenantRepositoriesModule global
    WbsModule,
    AuthModule,
    TenantModule,
    SearchModule,
    NotificationsModule,
    AuditModule,
    ProjectsModule,
    OperationalBudgetsModule,
    SuperAdminModule,
    BillingModule,
    SettingsModule,
    EmailModule,
    DashboardModule,
    CurrencyModule,
    ClientModule,
    FinanceCoreModule,
    ReportingModule,
    MessagingModule,
    AiAssistantModule,
    MarketingModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LogSanitizationInterceptor, // Automated security scrubbing
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Runs very first to prevent DDoS/Brute-force
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Runs second: authenticates the user
    },
    {
      provide: APP_GUARD,
      useClass: TenancyGuard, // Runs second: resolves tenant context from the authenticated user
    },
    {
      provide: APP_GUARD,
      useClass: TenantAccessGuard, // Runs third: enforces tenant-level access control
    },
  ],
})
export class AppModule {}