import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  PaymentProvider,
  PaymentStrategy,
  TransactionRequest,
  TransactionResponse,
} from '../interfaces/payment-strategy.interface';

@Injectable()
export class PaypalProvider implements PaymentStrategy {
  private readonly logger = new Logger(PaypalProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET')!;
    const isSandbox = this.configService.get<boolean>('PAYPAL_SANDBOX', true);
    this.baseUrl = isSandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  getProviderName(): PaymentProvider {
    return PaymentProvider.PAYPAL;
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );
    return response.data.access_token;
  }

  async initializeTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v2/checkout/orders`,
          {
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: request.currency || 'USD',
                  value: request.amount.toString(),
                },
                description: `SentinelFi Subscription - ${request.email}`,
              },
            ],
            application_context: {
              return_url: request.callbackUrl,
              cancel_url: request.callbackUrl,
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const order = response.data;
      const approveLink = order.links.find((l: any) => l.rel === 'approve');

      return {
        reference: order.id,
        authorizationUrl: approveLink?.href,
        status: 'pending',
      };
    } catch (error: any) {
      this.logger.error(`PayPal initialization failed: ${error.message}`, error.response?.data);
      throw new Error(`PayPal initialization failed: ${error.message}`);
    }
  }

  async verifyTransaction(reference: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/v2/checkout/orders/${reference}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data.status === 'COMPLETED' || response.data.status === 'APPROVED';
    } catch (error: any) {
      this.logger.error(`PayPal verification failed: ${error.message}`, error.response?.data);
      return false;
    }
  }
}
