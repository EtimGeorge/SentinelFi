import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaystackProvider } from './providers/paystack.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [WebhookController],
  providers: [PaymentService, PaystackProvider, PaypalProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
