import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import { OperationalExpenseEntity } from "./operational-expense.entity";
import { PayrollEntryEntity } from "./payroll-entry.entity";
import { BudgetCategoryEntity } from "./budget-category.entity";
import { OperationalBudgetPeriodAllocationEntity } from "./operational-budget-period-allocation.entity";
import { OperationalBudgetsService } from "./operational-budgets.service";
import { OperationalBudgetsController } from "./operational-budgets.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [NotificationsModule, CommonModule],
  controllers: [OperationalBudgetsController],
  providers: [
    {
      provide: "OPERATIONALBUDGET_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalBudgetEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "OPERATIONALBUDGETCATEGORY_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalBudgetCategoryEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "OPERATIONALEXPENSE_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalExpenseEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "PAYROLLENTRY_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(PayrollEntryEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "BUDGETCATEGORY_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BudgetCategoryEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "OPERATIONALBUDGETPERIODALLOCATION_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalBudgetPeriodAllocationEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    OperationalBudgetsService,
  ],
  exports: [OperationalBudgetsService],
})
export class OperationalBudgetsModule {}
