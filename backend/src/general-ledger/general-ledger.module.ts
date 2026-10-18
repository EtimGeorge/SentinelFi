import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { JournalEntryEntity } from "./entities/journal-entry.entity";
import { JournalLineEntity } from "./entities/journal-line.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import { AccountClassEntity } from "../finance-core/entities/account-class.entity";
import { AccountGroupEntity } from "../finance-core/entities/account-group.entity";
import { GeneralLedgerService } from "./general-ledger.service";
import { GeneralLedgerController } from "./general-ledger.controller";
import { ChartOfAccountsService } from "../finance-core/chart-of-accounts.service";

/**
 * Owns the account master (COA) alongside the posting engine, so any module
 * that needs to post — OperationalBudgets included — can import this module
 * alone. ChartOfAccountsService lives here rather than in FinanceCoreModule
 * because OperationalBudgetsModule cannot import FinanceCoreModule (that
 * module already imports OperationalBudgetsModule and the cycle would fail
 * to resolve).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        JournalEntryEntity,
        JournalLineEntity,
        GLAccountEntity,
        AccountClassEntity,
        AccountGroupEntity,
      ],
      TENANT_DATA_SOURCE,
    ),
  ],
  controllers: [GeneralLedgerController],
  providers: [GeneralLedgerService, ChartOfAccountsService],
  exports: [GeneralLedgerService, ChartOfAccountsService],
})
export class GeneralLedgerModule {}
