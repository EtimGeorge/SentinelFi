export enum PaymentProvider {
  PAYSTACK = 'paystack',
  PAYPAL = 'paypal',
}

export interface TransactionRequest {
  email: string;
  amount: number;
  currency: string;
  metadata?: any;
  callbackUrl?: string;
}

export interface TransactionResponse {
  reference: string;
  authorizationUrl?: string;
  status: 'pending' | 'success' | 'failed';
}

export interface PaymentStrategy {
  initializeTransaction(request: TransactionRequest): Promise<TransactionResponse>;
  verifyTransaction(reference: string): Promise<boolean>;
  getProviderName(): PaymentProvider;
}
