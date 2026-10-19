import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { BudgetVirementEntity } from "./entities/budget-virement.entity";
import { BudgetVirementService } from "./budget-virement.service";
import { BudgetVirementController } from "./budget-virement.controller";
import { OperationalBudgetCategoryEntity } from "../operational-budgets/operational-budget-category.entity";
import { OperationalBudgetEntity } from "../operational-budgets/operational-budget.entity";
import { ApprovalLogEntity } from "../common/entities/approval-log.entity";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    CommonModule, // DoaService
    NotificationsModule,
  ],
  controllers: [BudgetVirementController],
  providers: [
    {
      provide: "BUDGET_VIREMENT_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BudgetVirementEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "OPERATIONALBUDGETCATEGORY_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalBudgetCategoryEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "OPERATIONALBUDGET_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(OperationalBudgetEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "APPROVAL_LOG_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(ApprovalLogEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    BudgetVirementService,
  ],
  exports: [BudgetVirementService],
})
export class BudgetVirementModule {}
