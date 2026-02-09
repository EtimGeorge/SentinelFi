import { DataSource, DataSourceOptions, QueryRunner } from "typeorm";
import { ClsService } from "nestjs-cls";

import { UserEntity } from "../auth/user.entity";
import { RoleEntity } from "../auth/role.entity";
import { PermissionEntity } from "../auth/permission.entity";
import { AuditLogEntity } from "../audit/audit.entity";
import { TenantEntity } from "../tenants/tenant.entity";
import { ProjectEntity } from "../projects/project.entity";
import { ProjectInflowEntity } from "../projects/project-inflow.entity";
import { ProjectAuditEntity } from "../projects/project-audit.entity";
import { LpoEntity } from "../projects/lpo.entity";
import { WbsCategoryEntity } from "../wbs/wbs-category.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { SettingsEntity } from "../settings/settings.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalExpenseEntity } from "../operational-budgets/operational-expense.entity";
import { PayrollEntryEntity } from "../operational-budgets/payroll-entry.entity";
import { BudgetCategoryEntity } from "../operational-budgets/budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity } from "../operational-budgets/operational-budget-period-allocation.entity";
import { ClientEntity } from "../clients/client.entity";
import { CurrencyExchangeRateEntity } from "../currency/currency.entity";
import { CEOAnnotationEntity } from "../dashboard/annotation.entity";

/**
 * Custom DataSource that wraps the standard TypeORM DataSource to implement multi-tenancy.
 * It uses the 'nestjs-cls' service (Async Local Storage) to retrieve the current tenant's
 * schema name and ensures that every QueryRunner created sets the PostgreSQL 'search_path'
 * to that schema.
 */
export class TenancyAwareDataSource extends DataSource {
  constructor(
    options: DataSourceOptions,
    private readonly cls: ClsService,
  ) {
    super({
      ...options,
      entities: [
        UserEntity,
        RoleEntity,
        PermissionEntity,
        AuditLogEntity,
        TenantEntity,
        ProjectEntity,
        ProjectInflowEntity,
        ProjectAuditEntity,
        LpoEntity,
        WbsCategoryEntity,
        WbsBudgetEntity,
        LiveExpenseEntity,
        SettingsEntity,
        OperationalBudgetEntity,
        OperationalBudgetCategoryEntity,
        OperationalExpenseEntity,
        PayrollEntryEntity,
        BudgetCategoryEntity,
        OperationalBudgetPeriodAllocationEntity,
        ClientEntity,
        CurrencyExchangeRateEntity,
        CEOAnnotationEntity,
      ],
    });
  }

  /**
   * Overrides the default createQueryRunner to inject tenant context.
   * @param mode Replication mode (master/slave) - passed through to super
   */
  createQueryRunner(mode?: "master" | "slave"): QueryRunner {
    const queryRunner = super.createQueryRunner(mode);
    const originalConnect = queryRunner.connect.bind(queryRunner);

    // Override the connect method of the QueryRunner
    queryRunner.connect = async () => {
      // 1. Establish the physical connection using the original method
      await originalConnect();

      // 2. Retrieve the schema name from the CLS context
      const schemaName = this.cls.get("SCHEMA_NAME");

      // 3. Set the search_path for this connection session
      // Optimization: Only run the query if schema is explicitly set and NOT public
      // Default connection in Postgres usually starts in 'public' or search_path defaults.
      if (schemaName && schemaName !== "public") {
        try {
          const sanitizedSchema = schemaName.replace(/[^a-z0-9_]/gi, "");
          await queryRunner.query(
            `SET search_path TO ${sanitizedSchema}, public`,
          );
        } catch (err) {
          console.error(`[TenancyAwareDataSource] Critical: Failed to switch schema to ${schemaName}`, err);
          // If we can't switch schema, we shouldn't proceed as it might leak data from another tenant
          throw err;
        }
      }
    };

    return queryRunner;
  }
}
