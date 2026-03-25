# 🔐 Secret Keys Acquisition Guide

This guide provides step-by-step instructions for obtaining all the required API keys and secret credentials for the **SentinelFi** ecosystem.

---

## 1. 🤖 AI Framework (Google Gemini)
**Requirement**: `GEMINI_API_KEY`
**Purpose**: Powering the AI Orchestration Engine and Financial Insights.

1.  Go to [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google Account.
3.  Click on **"Get API key"** in the left sidebar.
4.  Click **"Create API key in new project"**.
5.  **Copy the key** and paste it into `GEMINI_API_KEY` in your `.env.prod` file.

---

## 2. 📧 Email Service (Resend)
**Requirement**: `RESEND_API_KEY`
**Purpose**: Automated transactional emails (Onboarding, Notifications, Reports).

1.  Sign up at [Resend.com](https://resend.com/signup).
2.  Verify your email and domain (for production use).
3.  Navigate to **API Keys** in the dashboard.
4.  Click **"Create API Key"**.
5.  Give it a name (e.g., `SentinelFi-Server`) and select **"Full Access"**.
6.  **Copy the key** and paste it into `RESEND_API_KEY` in your `.env.prod` file.

---

## 3. 💳 Payment Processing (Paystack)
**Requirement**: `PAYSTACK_SECRET_KEY` & `PAYSTACK_PUBLIC_KEY`
**Purpose**: Handling fiat payments and subscription billing.

1.  Login to your [Paystack Dashboard](https://dashboard.paystack.com/).
2.  Navigate to **Settings** -> **API Keys & Webhooks**.
3.  Depending on your state (Test or Live):
    *   **Test Mode**: Copy the `Secret Key` (starts with `sk_test_`) and `Public Key` (starts with `pk_test_`).
    *   **Live Mode**: Copy the `Secret Key` (starts with `sk_live_`) and `Public Key` (starts with `pk_live_`).
4.  Paste these into the respective Paystack variables in `.env.prod`.

---

## 🌎 Global Payments (PayPal)
**Requirement**: `PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET`
**Purpose**: Handling international payments.

1.  Log in to the [PayPal Developer Portal](https://developer.paypal.com/dashboard/).
2.  Click on **"Apps & Credentials"**.
3.  Create a new App (e.g., `SentinelFi-App`).
4.  Copy the **Client ID** and the **Secret Key**.
5.  Paste these into the respective PayPal variables in `.env.prod`.

---

## 📤 SMTP Fallback (Gmail App Password)
**Requirement**: `SMTP_USER` & `SMTP_PASS`
**Purpose**: Use a standard Gmail account for sending emails if not using Resend.

1.  Log in to your [Google Account Settings](https://myaccount.google.com/).
2.  Enable **2-Step Verification** (Mandatory for App Passwords).
3.  Search for **"App Passwords"** in the search bar.
4.  Select **"Mail"** for the app and **"Other (Custom Name)"** for the device (type `SentinelFi`).
5.  Google will generate a **16-character password**.
6.  Paste your email as `SMTP_USER` and the 16-character code into `SMTP_PASS`.

---

## 🛡️ AI Failover (OpenRouter) - Optional
**Requirement**: `OPENROUTER_API_KEY`
**Purpose**: Backup AI provider if primary Google Gemini limits are reached.

1.  Go to [OpenRouter.ai](https://openrouter.ai/keys).
2.  Log in and click **"Create Key"**.
3.  Add some credits to your balance if you wish to use paid models (though the free Gemini flash models are supported).
4.  **Copy the key** and paste it into `OPENROUTER_API_KEY`.

---

## 📝 How to Update Your Configuration

1.  Locate the **[.env.prod](file:///c:/temp/SentinelFi/.env.prod)** file in the root of the project.
2.  Replace the placeholder text (e.g., `your_gemini_api_key_here`) with the actual keys you obtained above.
3.  **Save the file.**
4.  If you are using Docker, rebuild your containers to apply the changes:
    ```powershell
    docker-compose up --build -d
    ```

> [!CAUTION]
> **NEVER** share these keys in public forums, screenshots, or commit them to a public GitHub repository. These keys grant access to your paid services and financial accounts.
