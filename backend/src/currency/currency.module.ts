import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CurrencyService } from "./currency.service";
import { CurrencyController } from "./currency.controller";
import {
  CurrencyExchangeRateEntity,
  CurrencyMetadataEntity,
} from "./currency.entity";
import { TenantModule } from "../tenants/tenant.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CurrencyExchangeRateEntity,
      CurrencyMetadataEntity,
    ]),
    TenantModule,
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService], // Export for use in other modules
})
export class CurrencyModule {}
