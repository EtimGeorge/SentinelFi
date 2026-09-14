import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { TenantDatabaseModule } from "../database/tenant-database.module";
import { CurrencyModule } from "../currency/currency.module";

@Module({
  imports: [TenantDatabaseModule, CurrencyModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
