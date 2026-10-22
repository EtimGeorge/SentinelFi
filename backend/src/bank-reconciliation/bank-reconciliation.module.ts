import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import {
  BankAccountEntity,
  BankStatementLineEntity,
  BankReconciliationEntity,
  BankReconciliationLineEntity,
} from "./entities/index";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { BankReconciliationController } from "./bank-reconciliation.controller";
import { TenantDatabaseModule } from "../database/tenant-database.module";
import { CommonModule } from "../common/common.module";
import { FinanceCoreModule } from "../finance-core/finance-core.module";
import { GeneralLedgerModule } from "../general-ledger/general-ledger.module";
import { CurrencyModule } from "../currency/currency.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    TenantDatabaseModule, // TENANT_DATA_SOURCE
    CommonModule, // DoaService
    FinanceCoreModule, // postJournalEntry + chart of accounts
    GeneralLedgerModule, // provides ChartOfAccountsService + GeneralLedgerService
    CurrencyModule, // multi-currency spot rates
    NotificationsModule, // variance alerts
    AuditModule,
    // Registers the TENANT_DATA_SOURCE_<Entity>Repository tokens that
    // BankReconciliationService injects via @InjectRepository(..., TENANT_DATA_SOURCE).
    TypeOrmModule.forFeature(
      [
        BankAccountEntity,
        BankStatementLineEntity,
        BankReconciliationEntity,
        BankReconciliationLineEntity,
      ],
      TENANT_DATA_SOURCE,
    ),
  ],
  controllers: [BankReconciliationController],
  providers: [BankReconciliationService],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
