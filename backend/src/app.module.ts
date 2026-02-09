import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Logger,
} from "@nestjs/common";
import { TenancyGuard } from "./common/guards/tenancy.guard";
import { TenantAccessGuard } from "./common/guards/tenant-access.guard"; // Import TenantAccessGuard
import { ClsModule } from "nestjs-cls";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
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

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env", "backend/.env.local", "backend/.env"],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Define all entities that TypeORM should be aware of for the main public connection.
        const entities = [
          WbsBudgetEntity,
          LiveExpenseEntity,
          UserEntity,
          RoleEntity,
          PermissionEntity,
          WbsCategoryEntity,
          TenantEntity,
          AuditLogEntity,
          ProjectEntity,
          LpoEntity,
          ProjectInflowEntity,
          ProjectAuditEntity,
          OperationalBudgetEntity,
          OperationalBudgetCategoryEntity,
          OperationalExpenseEntity,
          SettingsEntity,
          PayrollEntryEntity,
          BudgetCategoryEntity,
          OperationalBudgetPeriodAllocationEntity,
          CurrencyExchangeRateEntity,
          ClientEntity,
        ];

        // Delegate the entire configuration generation to the new, centralized DatabaseConfig class.
        return DatabaseConfig.getTypeOrmConfig(configService, entities);
      },
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
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Runs first: authenticates the user
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