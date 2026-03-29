import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { RenewalReminderService } from "./renewal-reminder.service";
import { SubscriptionController } from "./subscription.controller";
import { WebhookController } from "./webhook.controller";
import { SubscriptionEntity } from "./entities/subscription.entity";
import { BillingInvoiceEntity } from "./entities/billing-invoice.entity";
import { PaymentModule } from "../payment/payment.module";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenants/tenant.module";
import { EmailModule } from "../email/email.module";
import { CurrencyModule } from "../currency/currency.module";

import { WebhookService } from "./webhook.service";
import { ProcessedWebhookEntity } from "./entities/processed-webhook.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionEntity,
      BillingInvoiceEntity,
      ProcessedWebhookEntity,
    ]),
    ScheduleModule.forRoot(),
    PaymentModule,
    AuthModule,
    TenantModule,
    EmailModule,
    CurrencyModule,
  ],
  controllers: [BillingController, SubscriptionController, WebhookController],
  providers: [BillingService, WebhookService, RenewalReminderService],
  exports: [BillingService, WebhookService],
})
export class BillingModule {}
