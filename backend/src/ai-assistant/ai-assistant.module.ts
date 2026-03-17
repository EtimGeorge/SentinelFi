import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { FinancialContextService } from './financial-context.service';
import { GuardrailsService } from './guardrails.service';
import { TenantDatabaseModule } from '../database/tenant-database.module';

@Module({
  imports: [
    ConfigModule,
    TenantDatabaseModule,
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
