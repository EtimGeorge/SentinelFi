import { Module } from "@nestjs/common";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { BillingModule } from "../billing/billing.module";

/**
 * AdsModule — verified rewarded-ad loop + public ad-loader config.
 * Imports BillingModule one-directionally (no cycle: billing never
 * imports ads). Reward grants flow AdsService → BillingService.
 */
@Module({
  imports: [BillingModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
