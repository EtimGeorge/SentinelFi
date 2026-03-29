# SentinelFi: Email System Configuration Guide

SentinelFi supports two primary email delivery mechanisms: **Resend (API)** for high-reliability transactional delivery, and **Standard SMTP** for traditional mail servers (Gmail, Outlook, etc.).

---

## 🏗️ 1. Essential Configuration
All settings are managed via the root [`.env.prod`](file:///c:/temp/SentinelFi/.env.prod).

### 🧪 Global Settings
- **`EMAIL_PROVIDER`**: Set to `resend` (default) or `smtp`.
- **`EMAIL_FROM`**: The "From" address shown to users (e.g., `SentinelFi Support <noreply@yourdomain.com>`).
- **`EMAIL_PREVIEW_ONLY`**: 
  - `true`: (Default) Emails are only logged to the console (prevents spam during development).
  - `false`: **REQUIRED FOR PRODUCTION.** Emails are sent to the actual recipients.

---

## ⚡ 2. SMTP Setup (Standard)
If you are using a traditional mail server, configure the following:

| Variable | Description | Example (Gmail) |
| :--- | :--- | :--- |
| `SMTP_HOST` | The address of your mail server | `smtp.gmail.com` |
| `SMTP_PORT` | `465` (SSL) or `587` (STARTTLS) | `587` |
| `SMTP_SECURE` | Set `true` for 465, `false` for 587 | `false` |
| `SMTP_USER` | Your full login/email address | `admin@gmail.com` |
| `SMTP_PASS` | Your **App Password** | `xxxx xxxx xxxx xxxx` |

### 🔑 Important: Google/Gmail "App Passwords"
For security, modern providers like Gmail **do not allow** your main account password for SMTP.
1. Go to your **Google Account > Security**.
2. Enable **2-Step Verification**.
3. Search for **"App Passwords"**.
4. Generate a new password for "Mail" on your server.
5. Use this 16-character code in `SMTP_PASS`.

---

## 🚀 3. Resend Setup (API-Based)
Resend is the recommended provider for performance and scalability.
1. Create an account at [Resend.com](https://resend.com).
2. Generate an **API Key**.
3. Set `EMAIL_PROVIDER=resend`.
4. Set `RESEND_API_KEY=re_YourSecretKey`.

---

## 🛠️ 4. Troubleshooting
- **Connection Timed Out**: Ensure your server (or Docker container) isn't blocking port 587 or 465.
- **Authentication Failed**: Verify the `SMTP_USER` matches the domain of your `EMAIL_FROM` address if your provider enforces strict SPF/DKIM rules.
- **Emails Not Received**: Check the [`.env.prod`](file:///c:/temp/SentinelFi/.env.prod) for `EMAIL_PREVIEW_ONLY=true`. If it's true, nothing will be sent.

---
*Precision. Resilience. Intelligence. SentinelFi.*
