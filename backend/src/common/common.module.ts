import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BudgetControlService } from "./budget-control.service";
import { DOAService } from "./doa.service";
import { PdfGenerationService } from "./pdf-generation.service";
import { ApprovalLogEntity } from "./entities/approval-log.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { CurrencyModule } from "../currency/currency.module";
import { TENANT_DATA_SOURCE } from "../database/constants";

import { FinancialForensicsService } from "./services/financial-forensics.service";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalLogEntity], TENANT_DATA_SOURCE),
    NotificationsModule,
    CurrencyModule,
  ],
  providers: [
    BudgetControlService,
    DOAService,
    PdfGenerationService,
    FinancialForensicsService,
  ],
  exports: [
    BudgetControlService,
    DOAService,
    PdfGenerationService,
    FinancialForensicsService,
    TypeOrmModule,
  ],
})
export class CommonModule {}
