# 💸 Payment Flow & Money Movement Guide

This document explains how money moves through the **SentinelFi** system when a customer makes a payment using one of our supported gateways (PayPal or Paystack).

---

## 1. 🔄 The Transaction Lifecycle

When a customer decides to upgrade their subscription or pay a bill:

1.  **Initialization**: The SentinelFi backend uses your `API_KEYS` to talk to the provider (PayPal/Paystack) and create a unique "Transaction Intent."
2.  **Checkout**: The customer is redirected to a secure checkout page hosted by **PayPal** or **Paystack**. 
    *   *Security Note: SentinelFi never sees or stores the customer's credit card details.*
3.  **Authorization**: The customer authorizes the payment using their card, bank, or wallet balance.
4.  **Confirmation (Webhooks)**: Once the payment is successful, the provider sends a digital "receipt" (Webhook) back to our server.
5.  **Fulfillment**: SentinelFi receives this webhook, verifies it, and automatically unlocks the customer's features or marks the invoice as Paid.

---

## 2. 🏦 Where does the money reflect?

When a customer pays, the money **does not** go directly into your local bank account immediately. Instead, it reflects in your **Merchant Balance** on the provider's platform:

### 🔵 For PayPal Payments:
*   The funds reflect instantly in your **PayPal Business Dashboard** under "Available Balance."
*   The money is held by PayPal until you initiate a transfer.
*   **Whose account?** It reflects in the PayPal account associated with the `PAYPAL_CLIENT_ID` you configured.

### 🟠 For Paystack Payments:
*   The funds reflect in your **Paystack Dashboard** under "Balance."
*   Paystack typically aggregates payments and prepares them for a "Payout."
*   **Whose account?** It reflects in the Paystack Merchant account associated with your `PAYSTACK_SECRET_KEY`.

---

## 3. 🏧 How to withdraw your money (Payouts)

To get the money into your actual company bank account, you must follow the provider's payout process:

### 📥 Withdrawing from PayPal:
1.  Log in to your [PayPal Business Account](https://www.paypal.com).
2.  Click on **"Transfer Money"** or **"Withdraw Funds."**
3.  Select your linked Bank Account or Visa/Mastercard.
4.  Standard transfers take 1-3 business days. "Instant" transfers (to card) take minutes but usually involve a small fee.

### 📥 Withdrawing from Paystack:
1.  Log in to your [Paystack Dashboard](https://dashboard.paystack.com).
2.  Paystack usually performs **Automatic Payouts**. By default, for Nigerian businesses, they send your accumulated balance to your linked bank account every morning (T+1 basis).
3.  You can also trigger a **Manual Payout** if your account level supports it.
4.  Navigate to the **"Settlements"** tab to see a history of all money sent to your bank.

---

## 💡 Summary Comparison

| Feature | PayPal Flow | Paystack Flow |
| :--- | :--- | :--- |
| **Visibility** | Reflected in PayPal Dashboard | Reflected in Paystack Dashboard |
| **Payout Type** | Manual (You click "Transfer") | Automatic (Daily deposits) |
| **Settlement Time**| Immediate (to PayPal balance) | 24 Hours (to bank account) |
| **Currency** | Global (USD, EUR, etc.) | Regional (NGN, GHS, etc.) |

> [!TIP]
> **Check your Webhooks!**
> Ensure your `WEBHOOK_URL` is correctly configured in your PayPal/Paystack dashboards so that SentinelFi is notified when a payment happens. Without webhooks, the system won't know to activate the customer's account automatically.
