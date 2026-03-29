import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentProvider,
  PaymentStrategy,
  TransactionRequest,
  TransactionResponse,
} from "./interfaces/payment-strategy.interface";
import { PaystackProvider } from "./providers/paystack.provider";
import { PaypalProvider } from "./providers/paypal.provider";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private strategies: Map<PaymentProvider, PaymentStrategy> = new Map();

  constructor(
    private readonly paystackProvider: PaystackProvider,
    private readonly paypalProvider: PaypalProvider,
    private readonly configService: ConfigService,
  ) {
    this.strategies.set(PaymentProvider.PAYSTACK, this.paystackProvider);
    this.strategies.set(PaymentProvider.PAYPAL, this.paypalProvider);
  }

  getStrategy(provider?: PaymentProvider): PaymentStrategy {
    const defaultProvider = this.configService.get<PaymentProvider>(
      "DEFAULT_PAYMENT_PROVIDER",
      PaymentProvider.PAYSTACK,
    );
    const selectedProvider = provider || defaultProvider;
    const strategy = this.strategies.get(selectedProvider);

    if (!strategy) {
      throw new Error(
        `Payment strategy not found for provider: ${selectedProvider}`,
      );
    }

    return strategy;
  }

  async initializePayment(
    request: TransactionRequest,
    provider?: PaymentProvider,
  ): Promise<TransactionResponse> {
    const strategy = this.getStrategy(provider);
    this.logger.log(
      `Initializing payment via ${strategy.getProviderName()} for ${request.email}`,
    );
    return strategy.initializeTransaction(request);
  }

  async verifyPayment(
    reference: string,
    provider: PaymentProvider,
  ): Promise<boolean> {
    const strategy = this.getStrategy(provider);
    this.logger.log(
      `Verifying payment ${reference} via ${strategy.getProviderName()}`,
    );
    return strategy.verifyTransaction(reference);
  }
}
