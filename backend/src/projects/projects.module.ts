import { Module, forwardRef } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { DataSource } from "typeorm";
import { ProjectEntity } from "./project.entity";
import { LpoEntity } from "./lpo.entity";
import { ProjectInflowEntity } from "./project-inflow.entity";
import { ProjectAuditEntity } from "./project-audit.entity";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";
import { WbsModule } from "../wbs/wbs.module";

@Module({
  imports: [forwardRef(() => WbsModule)], // Use forwardRef to handle potential circular dependencies
  controllers: [ProjectsController],
  providers: [
    {
      provide: "PROJECT_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(ProjectEntity),
      inject: [TENANT_DATA_SOURCE],
    },
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
      provide: "LPO_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(LpoEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "PROJECTINFLOW_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(ProjectInflowEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "PROJECTAUDIT_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(ProjectAuditEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    ProjectsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
