import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { PaymentService } from "./payment.service";
import { PaystackProvider } from "./providers/paystack.provider";
import { PaypalProvider } from "./providers/paypal.provider";
// SEC-2026-001 RESOLUTION: legacy unsigned webhook REMOVED from the module.
// The hardened surface is billing/webhook.controller.ts + billing/webhook.service.ts.
// This file intentionally left unreferenced; do NOT re-register it.

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [],
  providers: [PaymentService, PaystackProvider, PaypalProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
