// backend/src/database/tenant-migration.service.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { DataSource, DataSourceOptions } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as path from "path";

// Import all entities that are part of the tenant schema
import { ProjectEntity } from "../projects/project.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { WbsCategoryEntity } from "../wbs/wbs-category.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "../operational-budgets/operational-expense.entity";
import { PayrollEntryEntity } from "../operational-budgets/payroll-entry.entity";
import { UserEntity } from "../auth/user.entity";
import { RoleEntity } from "../auth/role.entity"; // NEW
import { PermissionEntity } from "../auth/permission.entity"; // NEW
import { TenantEntity } from "../tenants/tenant.entity";
import { getTenantMigrationsPath } from "../common/utils/path.utils";
import { AuditLogEntity } from "../audit/audit.entity"; // NEW
import { BudgetCategoryEntity } from "../operational-budgets/budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity } from "../operational-budgets/operational-budget-period-allocation.entity";
import { ClientEntity } from "../clients/client.entity";
import { CEOAnnotationEntity } from "../dashboard/annotation.entity";
import { ApprovalLogEntity } from "../common/entities/approval-log.entity";
// FinanceCore enterprise entities - ensure new tenants get full financial intelligence schema
import { FiscalYearEntity } from "../finance-core/entities/fiscal-year.entity";
import { FiscalPeriodEntity } from "../finance-core/entities/fiscal-period.entity";
import { DepartmentEntity } from "../finance-core/entities/department.entity";
import { CostCenterEntity } from "../finance-core/entities/cost-center.entity";
import { AccountClassEntity } from "../finance-core/entities/account-class.entity";
import { AccountGroupEntity } from "../finance-core/entities/account-group.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import { BudgetLedgerEntity } from "../finance-core/entities/budget-ledger.entity";
import { P2PRequisitionEntity } from "../finance-core/entities/p2p-requisition.entity";
import { P2PPurchaseOrderEntity } from "../finance-core/entities/p2p-purchase-order.entity";
import { P2PInvoiceEntity } from "../finance-core/entities/p2p-invoice.entity";
import { PayrollRunEntity } from "../finance-core/entities/payroll-run.entity";
import { PayrollLineItemEntity } from "../finance-core/entities/payroll-line-item.entity";

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  constructor(private configService: ConfigService) {}

  async runTenantMigrations(schemaName: string): Promise<void> {
    this.logger.log(`Attempting to run migrations for schema: "${schemaName}"`);

    let databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      this.logger.error(
        "DATABASE_URL environment variable is not set for tenant migrations.",
      );
      throw new InternalServerErrorException(
        "DATABASE_URL environment variable is not set for tenant migrations. Please check your .env files (backend/.env or backend/.env.local).",
      );
    }

    // Clean and Normalize
    databaseUrl = databaseUrl.trim().replace(/^['"]|['"]$/g, "");
    if (databaseUrl.startsWith("postgresql://")) {
      databaseUrl = databaseUrl.replace("postgresql://", "postgres://");
    }

    // Credentials encoding if needed
    let sanitizedUrl = databaseUrl;
    const credsMatch = databaseUrl.match(/^(postgres:\/\/)([^:]+):(.+)@(.+)$/);
    if (credsMatch) {
      const [, proto, user, pass, rest] = credsMatch;
      const needsEncoding =
        /[\#\?\[\]\@]/.test(pass) || /[\#\?\[\]\@]/.test(user);
      if (needsEncoding) {
        sanitizedUrl = `${proto}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;
      }
    }

    const isNeon = sanitizedUrl.includes("neon.tech");
    const hasSslMode = sanitizedUrl.includes("sslmode=");

    const isProduction = process.env.NODE_ENV === "production";

    // Define tenant-specific DataSource options
    const tenantDataSourceOptions: DataSourceOptions = {
      type: "postgres",
      url: sanitizedUrl,
      ssl: isNeon && !hasSslMode ? { rejectUnauthorized: false } : undefined,
      schema: schemaName, // CRITICAL: Dynamically set the schema name
      entities: [
        ProjectEntity,
        WbsBudgetEntity,
        LiveExpenseEntity,
        WbsCategoryEntity,
        OperationalBudgetEntity,
        OperationalBudgetCategoryEntity,
        OperationalExpenseEntity,
        PayrollEntryEntity,
        BudgetCategoryEntity,
        OperationalBudgetPeriodAllocationEntity,
        ClientEntity,
        CEOAnnotationEntity,
        UserEntity, // Public entity (for reference)
        RoleEntity, // Public entity (for reference)
        PermissionEntity, // Public entity (for reference)
        TenantEntity, // Public entity (for reference)
        AuditLogEntity, // Public entity (for reference)
        ApprovalLogEntity, // Added
        FiscalYearEntity,
        FiscalPeriodEntity,
        DepartmentEntity,
        CostCenterEntity,
        AccountClassEntity,
        AccountGroupEntity,
        GLAccountEntity,
        BudgetLedgerEntity,
        P2PRequisitionEntity,
        P2PPurchaseOrderEntity,
        P2PInvoiceEntity,
        PayrollRunEntity,
        PayrollLineItemEntity,
      ],
      migrations: [getTenantMigrationsPath()],
      migrationsTableName: "tenant_migrations", // Dedicated migrations table for tenant schemas
      synchronize: false, // Always false in production
      logging: ["error", "warn"], // Only log errors and warnings for migrations
    };

    const tenantDataSource = new DataSource(tenantDataSourceOptions);

    try {
      await tenantDataSource.initialize();
      this.logger.log(
        `DataSource initialized for schema: "${schemaName}". Running migrations...`,
      );
      await tenantDataSource.runMigrations();
      this.logger.log(
        `Migrations successfully run for schema: "${schemaName}"`,
      );
    } catch (error: unknown) {
      // Explicitly mark as unknown
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to run migrations for schema "${schemaName}": ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        `Tenant schema migration failed for "${schemaName}": ${errorMessage}`,
      );
    } finally {
      if (tenantDataSource.isInitialized) {
        await tenantDataSource.destroy();
        this.logger.log(`DataSource destroyed for schema: "${schemaName}".`);
      }
    }
  }
}
