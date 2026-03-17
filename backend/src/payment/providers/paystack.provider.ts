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
export class PaystackProvider implements PaymentStrategy {
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')!;
  }

  getProviderName(): PaymentProvider {
    return PaymentProvider.PAYSTACK;
  }

  async initializeTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/transaction/initialize`,
          {
            email: request.email,
            amount: Math.round(request.amount * 100), // Paystack expects minor units (kobo)
            currency: request.currency || 'NGN',
            callback_url: request.callbackUrl,
            metadata: request.metadata,
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const { data } = response.data;

      return {
        reference: data.reference,
        authorizationUrl: data.authorization_url,
        status: 'pending',
      };
    } catch (error: any) {
      this.logger.error(`Paystack initialization failed: ${error.message}`, error.response?.data);
      throw new Error(`Payment initialization failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async verifyTransaction(reference: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );

      return response.data.data.status === 'success';
    } catch (error: any) {
      this.logger.error(`Paystack verification failed: ${error.message}`, error.response?.data);
      return false;
    }
  }
}
