import { Controller, Post, Body, Req, Headers, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentProvider } from './interfaces/payment-strategy.interface';

@Controller('payment/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('paystack')
  async handlePaystackWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string
  ) {
    this.logger.log(`Received Paystack Webhook: ${body.event}`);
    
    // In a production app, we would verify the signature here using the HMAC header.
    // if (!verifyPaystack(body, signature)) throw new UnauthorizedException();

    if (body.event === 'charge.success') {
      const reference = body.data.reference;
      this.logger.log(`Fulfilling Paystack order: ${reference}`);
      // TODO: Implementation logic for account activation upon payment success
    }

    return { received: true };
  }

  @Post('paypal')
  async handlePaypalWebhook(@Body() body: any) {
    this.logger.log(`Received PayPal Webhook: ${body.event_type}`);

    // Standard PayPal webhook verification would go here
    
    if (body.event_type === 'CHECKOUT.ORDER.APPROVED' || body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const reference = body.resource.id;
      this.logger.log(`Fulfilling PayPal order: ${reference}`);
      // TODO: Implementation logic for account activation upon payment success
    }

    return { received: true };
  }
}
