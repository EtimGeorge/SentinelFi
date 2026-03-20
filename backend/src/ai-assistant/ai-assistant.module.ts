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

@Module({
  imports: [
    ConfigModule,
    TenantDatabaseModule,
    TypeOrmModule.forFeature([AiAuditLogEntity]),
    CacheModule.register(), // Local override or global config inheritance
    HttpModule.register({
      timeout: 35000,     // Slightly longer than service timeout
      maxRedirects: 0,
    }),
  ],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    FinancialContextService,
    GuardrailsService,
  ],
  exports: [AiAssistantService, GuardrailsService, FinancialContextService],
})
export class AiAssistantModule {}
