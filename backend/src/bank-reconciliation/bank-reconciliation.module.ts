import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import {
  BankAccountEntity,
  BankStatementLineEntity,
  BankReconciliationEntity,
  BankReconciliationLineEntity,
} from "./entities/index";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { BankReconciliationController } from "./bank-reconciliation.controller";
import { CommonModule } from "../common/common.module";
import { FinanceCoreModule } from "../finance-core/finance-core.module";
import { CurrencyModule } from "../currency/currency.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    CommonModule, // DoaService
    FinanceCoreModule, // postJournalEntry + chart of accounts
    CurrencyModule, // multi-currency spot rates
    NotificationsModule, // variance alerts
    AuditModule,
  ],
  controllers: [BankReconciliationController],
  providers: [
    {
      provide: "BANK_ACCOUNT_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BankAccountEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "BANK_STATEMENT_LINE_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BankStatementLineEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "BANK_RECONCILIATION_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BankReconciliationEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    {
      provide: "BANK_RECONCILIATION_LINE_REPOSITORY",
      useFactory: (dataSource: DataSource) =>
        dataSource.getRepository(BankReconciliationLineEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    BankReconciliationService,
  ],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
