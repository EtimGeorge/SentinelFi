import { Module, forwardRef } from "@nestjs/common";
import { DataSource } from "typeorm";
import { WbsBudgetEntity } from "./wbs-budget.entity";
import { LiveExpenseEntity } from "./live-expense.entity";
import { WbsCategoryEntity } from "./wbs-category.entity";
import { WbsTemplateEntity } from "./wbs-template.entity";
import { WbsService } from "./wbs.service";
import { WbsController } from "./wbs.controller";
import { AiController } from "./ai.controller";
import { DcsController } from "./dcs.controller";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { ProjectsModule } from "../projects/projects.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuditModule } from "../audit/audit.module";
import { BudgetControlService } from "../common/budget-control.service";
import { TenantModule } from "../tenants/tenant.module";

@Module({
  imports: [forwardRef(() => ProjectsModule), NotificationsModule, AuditModule, forwardRef(() => TenantModule), CommonModule],
  controllers: [WbsController, AiController, DcsController],
  providers: [
    {
      provide: "WBSBUDGET_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(WbsBudgetEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "LIVEEXPENSE_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(LiveExpenseEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "WBSCATEGORY_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(WbsCategoryEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "WBSTEMPLATE_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(WbsTemplateEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    WbsService,
  ],
  exports: [WbsService, "WBSBUDGET_REPOSITORY", "LIVEEXPENSE_REPOSITORY"], // Export repositories for use in other modules if needed
})
export class WbsModule {}
