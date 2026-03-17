import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenants/tenant.module';
import { EmailModule } from '../email/email.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionEntity]),
    PaymentModule,
    AuthModule,
    TenantModule,
    EmailModule,
    CurrencyModule,
  ],
  controllers: [BillingController, SubscriptionController, WebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
