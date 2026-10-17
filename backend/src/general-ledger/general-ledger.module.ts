import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { JournalEntryEntity } from "./entities/journal-entry.entity";
import { JournalLineEntity } from "./entities/journal-line.entity";
import { GLAccountEntity } from "../finance-core/entities/gl-account.entity";
import { GeneralLedgerService } from "./general-ledger.service";
import { GeneralLedgerController } from "./general-ledger.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [JournalEntryEntity, JournalLineEntity, GLAccountEntity],
      TENANT_DATA_SOURCE,
    ),
  ],
  controllers: [GeneralLedgerController],
  providers: [GeneralLedgerService],
  exports: [GeneralLedgerService],
})
export class GeneralLedgerModule {}
