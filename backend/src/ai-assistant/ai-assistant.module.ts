import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { FinancialContextService } from './financial-context.service';
import { GuardrailsService } from './guardrails.service';
import { TenantDatabaseModule } from '../database/tenant-database.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAuditLogEntity } from './ai-audit-log.entity';
import { ReportScheduleEntity } from './report-schedule.entity';
import { AiReportSchedulerService } from './ai-report-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TENANT_DATA_SOURCE } from '../database/constants';

@Module({
  imports: [
    ConfigModule,
    TenantDatabaseModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AiAuditLogEntity]),
    TypeOrmModule.forFeature([ReportScheduleEntity], TENANT_DATA_SOURCE),
    CacheModule.register(),
    HttpModule.register({
      timeout: 35000,
      maxRedirects: 0,
    }),
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, FinancialContextService, GuardrailsService, AiReportSchedulerService],
  exports: [AiAssistantService, GuardrailsService, FinancialContextService],
})
export class AiAssistantModule {}
