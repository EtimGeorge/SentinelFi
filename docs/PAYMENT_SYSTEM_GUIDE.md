# SentinelFi: Payment Infrastructure & Gateway Guide

SentinelFi is designed with a **Strategy Pattern** architecture, allowing you to swap or add payment providers (Paystack, PayPal, Ivorypay) without touching the core billing logic.

---

## 🏗️ 1. Core Architecture: The "Bulletproof" Strategy
We use a decoupled architecture to ensure resilience:
1. **`PaymentStrategy`**: An interface that defines how to initialize and verify transactions.
2. **`WebhookService`**: A centralized security layer that verifies signatures and ensures **Idempotency** (preventing double-billing via `processed_webhooks` table).
3. **`BillingService`**: The high-level orchestrator that only cares if a payment was "Successful," regardless of the provider.

---

## 💳 2. Gateway Configuration

### 🇳🇬 Paystack (Recommended for Africa/NGN)
- **Mode**: Best for Local NGN/GHS transactions.
- **Setup**:
  - `PAYSTACK_SECRET_KEY`: Get from [Paystack Dashboard](https://dashboard.paystack.com).
  - **Webhook URL**: `https://api.yourdomain.com/api/v1/billing/webhook/paystack`
- **Security**: The system automatically verifies the `x-paystack-signature` HMAC-SHA512.

### 🌎 PayPal (Global Reach)
- **Mode**: Best for international USD clients.
- **Setup**:
  - `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: Get from [PayPal Developer](https://developer.paypal.com).
  - `PAYPAL_SANDBOX`: Set to `true` for testing.
- **Webhook URL**: `https://api.yourdomain.com/api/v1/billing/webhook/paypal`

---

## 🛠️ 3. How to Add a New Gateway (e.g., Ivorypay or Remita)

To add a new provider (e.g., **Ivorypay** for Crypto or **Remita** for Gov/Treasury), follow these steps:

### Step 1: Add to Provider Enum
Update `backend/src/payment/interfaces/payment-strategy.interface.ts`:
```typescript
export enum PaymentProvider {
  PAYSTACK = 'paystack',
  PAYPAL = 'paypal',
  IVORYPAY = 'ivorypay', // Add here
}
```

### Step 2: Create the Strategy
Create `backend/src/payment/providers/ivorypay.provider.ts` implementing `PaymentStrategy`.

### Step 3: Register in PaymentModule
Add the new provider to the `providers` array in `payment.module.ts`.

---

## 🛡️ 4. Advanced: Webhook Testing & Security

### 🧪 Local Webhook Testing (The Pro Way)
Webhooks require a public URL. To test locally without deploying:
1. Install [ngrok](https://ngrok.com).
2. Run: `ngrok http 3000`.
3. Use the ngrok URL (e.g., `https://xyz.ngrok-free.app`) in your Gateway dashboard.

### 🛑 Sparring Partner Note: Why Idempotency Matters
In production, a gateway might send the same "Successful" webhook 5 times due to network retries. **SentinelFi's `ProcessedWebhookEntity` captures the `gateway_event_id`.** If the ID already exists, the system ignores the duplicate, ensuring you never provision 5 tenants for 1 payment.

---

## 💡 sparring Suggestion: The "Crypto" Advantage
For a construction engineering firm, I strongly advise looking at **Ivorypay**. 
- **Reason**: Traditional banks often delay large NGN-to-USD transfers for materials. Stablecoin (USDT/USDC) payments via Ivorypay settle in minutes and bypass local liquidity issues.

---
*Precision. Resilience. Intelligence. SentinelFi.*
