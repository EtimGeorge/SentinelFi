import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { OperationalBudgetEntity } from "./operational-budget.entity";
import { OperationalBudgetCategoryEntity } from "./operational-budget-category.entity";
import { OperationalExpenseEntity } from "./operational-expense.entity";
import { PayrollEntryEntity } from "./payroll-entry.entity";
import { OperationalBudgetsService } from "./operational-budgets.service";
import { OperationalBudgetsController } from "./operational-budgets.controller";

@Module({
  imports: [],
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
    OperationalBudgetsService,
  ],
  exports: [OperationalBudgetsService],
})
export class OperationalBudgetsModule {}
