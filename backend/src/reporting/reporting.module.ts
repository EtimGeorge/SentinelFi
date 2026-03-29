import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportingService } from "./reporting.service";
import { DcsClientService } from "./dcs-client.service";
import { ReportingController } from "./reporting.controller";
import { DocumentControlEntity } from "../common/entities/document-control.entity";
import { ReportScheduleEntity } from "../common/entities/report-schedule.entity";
import { WbsModule } from "../wbs/wbs.module";
import { OperationalBudgetsModule } from "../operational-budgets/operational-budgets.module";
import { ProjectsModule } from "../projects/projects.module";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { AiAssistantModule } from "../ai-assistant/ai-assistant.module";

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [DocumentControlEntity, ReportScheduleEntity],
      TENANT_DATA_SOURCE,
    ),
    WbsModule,
    OperationalBudgetsModule,
    ProjectsModule,
    AiAssistantModule,
  ],
  providers: [ReportingService, DcsClientService],
  controllers: [ReportingController],
  exports: [ReportingService, DcsClientService],
})
export class ReportingModule {}
