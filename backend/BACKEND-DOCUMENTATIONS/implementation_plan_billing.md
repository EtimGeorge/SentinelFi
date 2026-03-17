# Billing Architecture Overhaul — Final Plan

## Architecture Overview

The [TenantEntity](file:///c:/temp/SentinelFi/backend/src/tenants/tenant.entity.ts#11-62) already has `expires_at` and `is_active` fields. The [InvitationService](file:///c:/temp/SentinelFi/backend/src/auth/invitation.service.ts#11-76) has a working magic-link flow. The [JwtAuthGuard](file:///c:/temp/SentinelFi/backend/src/auth/guards/jwt-auth.guard.ts#7-28) supports a `@Public()` decorator. We build on these — no greenfield.

```
Landing: Trial CTA ──► POST /billing/start-trial ──► Create Tenant (status:trialing) ──► InvitationService ──► Magic-Link Email
Landing: Buy CTA ──► POST /billing/process-public-subscription ──► Create pending record ──► Redirect to Gateway
Gateway Webhook ──────────────────────────────────────────────────────────────────────► Activate Tenant ──► Magic-Link Email
SuperAdmin ──────────────────────────────────────────────────────────► bypass ──► Create Tenant + User directly
JWT Guard (every request) ──► Check tenant.expires_at + is_active ──► 402 if expired
```

---

## Pricing Model (Industry Standard)

| Plan | Price | Features |
|------|-------|----------|
| **Free Trial** | $0 / 14 days | Full Pro access. No credit card required. Automatic expiry. |
| **Professional** | $1,500/mo or $15,300/yr (15% off) | 3 tenant instances, full AI engine, all features |
| **Enterprise** | Contact Sales | Unlimited tenancies, on-premise option, dedicated engineer |

---

## Phase 1 — Currency API: Make Rates Public

**Problem**: `/currency/rates` requires JWT. Public pricing page can't fetch live rates.

#### [MODIFY] [currency.controller.ts](file:///c:/temp/SentinelFi/backend/src/currency/currency.controller.ts)
- Add `@Public()` to `GET /currency/rates` and `GET /currency/supported`
- Remove class-level `@UseGuards(JwtAuthGuard)` — apply guard per-method instead
- Leave `POST /currency/update-rates` as admin-only

#### [MODIFY] [CurrencyContext.tsx](file:///c:/temp/SentinelFi/frontend/components/context/CurrencyContext.tsx)
- Remove `if (!isAuthenticated) return;` guard from rate-fetching `useEffect`
- Use an `axios` call without the auth interceptor for public rate fetching
- Authenticated users get rates from `/currency/supported` (full metadata); public visitors get rates from `/currency/rates` (lightweight)

---

## Phase 2 — Pricing Page Rebuild

#### [MODIFY] [pricing.tsx](file:///c:/temp/SentinelFi/frontend/pages/landing/pricing.tsx)
- Three columns: **Trial**, **Professional**, **Enterprise**
- Currency selector ([CurrencySelector](file:///c:/temp/SentinelFi/frontend/components/common/CurrencySelector.tsx#6-70) component) in page header — fetches live rates without auth
- Prices shown in selected currency with `≈` prefix and [(billed in USD)](file:///c:/temp/SentinelFi/frontend/pages/_app.tsx#134-218) footnote
- Annual/Monthly toggle — Pro plan: $1,500/mo or $15,300/yr
- CTA buttons: "Start Free Trial" → `/landing/checkout?plan=trial`, "Go Professional" → `/landing/checkout?plan=pro&cycle=monthly|annual`

#### [MODIFY] [checkout.tsx](file:///c:/temp/SentinelFi/frontend/pages/landing/checkout.tsx)
- Dynamically shows trial vs. paid UI based on `plan` query param
- For trial: No gateway selection. Immediate form submit → `/billing/start-trial`
- For paid: Gateway selector (Paystack/PayPal). Shows local currency equivalent from live rate
- Always sends `amount_usd: 1500`, `billing_cycle`, `plan` to backend

---

## Phase 3 — Subscription Entity (Missing from DB)

#### [NEW] `backend/src/billing/entities/subscription.entity.ts`
```typescript
enum SubscriptionStatus { TRIALING='trialing', ACTIVE='active', EXPIRED='expired', CANCELLED='cancelled', PENDING='pending' }
enum BillingCycle { MONTHLY='monthly', ANNUAL='annual' }

@Entity({ name: 'subscriptions', schema: 'public' })
export class SubscriptionEntity {
  id: string; // uuid
  tenant_id: string; // FK → tenants
  plan: string; // 'trial' | 'professional' | 'enterprise'
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount_usd: number;
  gateway: string; // 'paystack' | 'paypal' | 'superadmin'
  gateway_reference: string; // payment ref from gateway
  trial_ends_at: Date | null;
  current_period_start: Date;
  current_period_end: Date; // KEY: this drives expiry blocking
  cancelled_at: Date | null;
  created_at, updated_at: Date;
}
```

#### [NEW] Migration: `CreateSubscriptionsTable`

---

## Phase 4 — Webhook-First Provisioning (CRITICAL FIX)

**New flow for paid subscriptions:**
1. `POST /billing/process-public-subscription` → Saves `pending` Subscription → Calls payment gateway → Returns `authorization_url`
2. User completes payment on gateway
3. Gateway POSTs to `/billing/webhook/paystack` or `/billing/webhook/paypal`
4. Backend verifies HMAC-SHA512 signature (Paystack) or IPN signature (PayPal)
5. Updates Subscription → `active` → Updates `TenantEntity.expires_at = current_period_end`
6. Calls `InvitationService.createInvitation(adminEmail, Role.AdminDirector, tenant)`
7. Magic-link dispatched. User clicks link → `/auth/accept-invitation?token=xxx` → Sets password → Logs in

**Paystack-specific:**
- Amount must be in **Kobo** (NGN). Use `CurrencyService.convertAmount(1500, 'USD', 'NGN') × 100`
- Verify with `x-paystack-signature` header (HMAC-SHA512 of raw body with `PAYSTACK_SECRET_KEY`)

#### [NEW] [webhook.controller.ts](file:///c:/temp/SentinelFi/backend/src/billing/webhook.controller.ts)
#### [NEW] `handlePaystackWebhook()` and `handlePaypalWebhook()` in billing.service.ts
#### [MODIFY] [billing.service.ts](file:///c:/temp/SentinelFi/backend/src/billing/billing.service.ts) — inject [CurrencyService](file:///c:/temp/SentinelFi/backend/src/currency/currency.service.ts#7-272)

**Free Trial flow (`POST /billing/start-trial`):**
1. Validates email not already in a tenant
2. Creates Tenant immediately (status: `trialing`, `expires_at = now + 14 days`)
3. Creates Subscription row: `status: TRIALING`, `trial_ends_at = now + 14 days`
4. Calls `InvitationService.createInvitation()` → Magic-link dispatched instantly
5. Redirects to `/auth/check-email`

---

## Phase 5 — SuperAdmin Billing Authority

**SuperAdmin can provision tenants directly, bypassing the payment gateway.**

#### [NEW/MODIFY] SuperAdmin provisioning endpoint: `POST /super/billing/provision-tenant`
```typescript
@Roles(Role.SuperAdmin)
@Post('provision-tenant')
async provisionTenant(@Body() dto: ProvisionTenantDto) {
  // 1. Create Tenant
  // 2. Create Subscription (gateway: 'superadmin', status: 'active', amount_usd: custom)
  // 3. Call InvitationService.createInvitation(adminEmail, Role.AdminDirector, tenant)
  // Returns: { tenant, invitation, inviteUrl }
}
```

**DTO**: `companyName`, `adminEmail`, `plan`, `billingCycle`, `amount_usd`, `months` (how many months to provision)

#### [NEW] SuperAdmin billing view: `GET /super/billing/tenants` — lists all tenants with subscription status, expiry, ARR

---

## Phase 6 — Subscription Expiry Blocking

**Mechanism**: Enrich the JWT guard to check subscription status on every request.

#### [MODIFY] [jwt-auth.guard.ts](file:///c:/temp/SentinelFi/backend/src/auth/guards/jwt-auth.guard.ts)
```typescript
// After JWT validates:
async canActivate(context) {
  const jwtResult = await super.canActivate(context);
  if (!jwtResult) return false;
  
  const user = context.switchToHttp().getRequest().user;
  if (!user.tenant_id) return true; // SuperAdmin, no tenant
  
  const tenant = await this.tenantService.findOne(user.tenant_id);
  if (!tenant.is_active) throw new ForbiddenException('TENANT_SUSPENDED');
  if (tenant.expires_at && new Date() > tenant.expires_at) {
    throw new HttpException({ code: 'SUBSCRIPTION_EXPIRED', renewUrl: '/settings/subscription' }, 402);
  }
  return true;
}
```

#### [MODIFY] [AuthContext.tsx](file:///c:/temp/SentinelFi/frontend/components/context/AuthContext.tsx)
- Intercept 402 responses globally → redirect to `/settings/subscription?expired=true`
- Show a system-wide toast: "Your subscription has expired. Renew to continue."

---

## Phase 7 — Admin Subscription Countdown (Protected Pages)

#### [NEW] `SubscriptionBanner` component
- Appears in [LayoutNav.tsx](file:///c:/temp/SentinelFi/frontend/components/Layout/LayoutNav.tsx) (protected app header) when `tenant.expires_at` is within 30 days
- Shows: `⏱ Subscription renews in 12 days` (green/yellow/red depending on days remaining)
- On click → opens renewal modal or navigates to `/settings/subscription`

#### [NEW] `GET /billing/my-subscription` endpoint (authenticated)
- Returns: `{ plan, status, current_period_end, trial_ends_at, billing_cycle, gateway }`
- Used by both the settings page and the `SubscriptionBanner` component

#### [NEW] `frontend/pages/settings/subscription.tsx`
- Shows current plan details, expiry date, renewal cost
- Renew button → initiates same checkout flow
- Cancel flow (sets `cancelled_at`, tenant continues until period end)

---

## Phase 8 — Missing Pages

#### [NEW] [billing/success.tsx](file:///c:/temp/SentinelFi/frontend/pages/billing/success.tsx)
- Polls `GET /billing/subscription/status?ref={gateway_reference}` every 3s
- Once status = `active`: Shows "Workspace Provisioned" + "Check email for magic-link"

#### [NEW] [auth/check-email.tsx](file:///c:/temp/SentinelFi/frontend/pages/auth/check-email.tsx)
- Clean "check your inbox" page for both trial and paid flows

---

## Verification Plan

### Automated
- `GET /currency/rates` → 200 without Authorization header
- `POST /billing/start-trial` → returns 201, subscription row `status=trialing`, tenant `is_active=true`, invitation dispatched
- Paystack mock webhook → subscription `status=active`, tenant `expires_at` set, invitation dispatched
- authenticated request with expired tenant → 402 with `SUBSCRIPTION_EXPIRED` code

### Manual
1. Visit `/landing/pricing` as guest → currency selector works with live rates
2. Click "Start Free Trial" → complete form → redirected to `/auth/check-email`
3. Open magic-link → accept invitation → set password → login
4. SuperAdmin provisions tenant via dashboard → invitation dispatched → tenant can login
5. Manually expire a tenant's `expires_at` → verify redirect to `/settings/subscription?expired=true`
6. Visit `/settings/subscription` → view plan details and renewal CTA
7. Renewal countdown appears in app header with correct days remaining


## Background & Honest Assessment

Before implementing, let me challenge two assumptions in the request:

> [!WARNING]
> **Assumption 1: "Pass USD to Paystack"** — This is technically wrong. Paystack is a Nigerian payment processor. For merchants with NGN settlement accounts, Paystack **requires amounts in Kobo (NGN × 100)**. Sending $1,500 USD directly to Paystack will fail. The correct approach: display prices in any currency, but convert to the Paystack account's settlement currency (NGN) server-side using live rates. PayPal accepts USD natively.

> [!WARNING]
> **Assumption 2: Single flat plan at $1,500/month** — I'll implement it, but I want you to stress-test this number. $1,500/month = $18,000/year. For a government ministry or a large construction firm, that's noise. But for a mid-size project team or a startup, that's a procurement blocker. **There is no freemium, no trials, no starter tier.** If a prospect can't self-serve a 14-day trial before committing $1,500, conversion rates will be very low. Industry standard (Linear, Monday, Asana) is: free trial → starter → professional → enterprise.
>
> My recommendation: Keep a **single Professional plan at $1,500/mo** BUT add a **14-day free trial with credit card on file** (industry standard). This is non-negotiable for B2B SaaS conversion. I'll implement this unless you explicitly override it.

---

## Proposed Changes

### Phase 1 — Currency API: Make It Public-Safe

**Problem**: `/currency/supported` and `/currency/rates` both require [JwtAuthGuard](file:///c:/temp/SentinelFi/backend/src/auth/guards/jwt-auth.guard.ts#7-28). Public pricing pages have no token, so they can't fetch live rates.

**Solution**: Add `@Public()` to specific read-only currency endpoints. The exchange rate data is not sensitive — it's publicly available from any finance website. Locking it behind auth only hurts your own conversion funnel.

#### [MODIFY] [currency.controller.ts](file:///c:/temp/SentinelFi/backend/src/currency/currency.controller.ts)
- Add `@Public()` decorator to `GET /currency/rates` and `GET /currency/supported`
- Leave `POST /currency/update-rates` protected (admin-only)

---

### Phase 2 — Pricing Model: $1,500 Flat + Trial

#### [MODIFY] [pricing.tsx](file:///c:/temp/SentinelFi/frontend/pages/landing/pricing.tsx)
- Replace 3-tier card grid with a **single plan** card (Professional Sovereign at $1,500/mo)
- Add prominent **14-day trial** CTA (no credit card language)
- Add currency selector dropdown using [useCurrency](file:///c:/temp/SentinelFi/frontend/components/context/CurrencyContext.tsx#54-55) hook — live rates from backend
- Show equivalent local price below USD price (e.g., "≈ ₦2,340,000 at live rate")
- Keep Enterprise "Contact Sales" path for >3 tenancy deals

#### [MODIFY] [checkout.tsx](file:///c:/temp/SentinelFi/frontend/pages/landing/checkout.tsx)
- Hardcode `$1,500 USD` as canonical price
- Display localized equivalent from live rate (informational only)
- Always submit `amount: 1500, currency: 'USD'` to backend
- Add `isTrial: boolean` flag — trial = no gateway redirect, provisioning only
- Add `billingCycle` to form (monthly/annual, annual = $1,500 × 12 × 0.85 = $15,300)

---

### Phase 3 — Backend: Subscription DB Model

**This is the most critical phase. Without this, billing has no memory.**

#### [NEW] `backend/src/billing/entities/subscription.entity.ts`
```typescript
// Fields: id, tenant_id, plan, status (active|trialing|expired|cancelled),
//         billing_cycle (monthly|annual), amount_usd, gateway, gateway_reference,
//         trial_ends_at, current_period_start, current_period_end, cancelled_at
```

#### [NEW] `backend/src/billing/dto/create-subscription.dto.ts`
#### [NEW] Migration: `CreateSubscriptionsTable`

---

### Phase 4 — Backend: Webhook-First Provisioning (CRITICAL FIX)

**Problem**: Tenant is provisioned before payment is confirmed. This is the #1 bug.

**New flow**:
1. POST `/billing/process-public-subscription` → Returns only a `paymentUrl`. Saves a **pending** subscription record. Does NOT create tenant.
2. User pays → Paystack/PayPal fires webhook to `/billing/webhook/paystack` or `/billing/webhook/paypal`
3. Backend verifies signature → Updates subscription to `active` → Creates tenant → Sends magic-link invitation email

#### [NEW] [webhook.controller.ts](file:///c:/temp/SentinelFi/backend/src/billing/webhook.controller.ts)
```typescript
@Controller('billing/webhook')
export class WebhookController {
  @Public()
  @Post('paystack')
  async paystackWebhook(@Headers('x-paystack-signature') sig, @Body() body, @RawBody() raw) {
    // 1. Verify HMAC-SHA512 signature against PAYSTACK_SECRET_KEY
    // 2. Handle charge.success event
    // 3. Provision tenant + send magic-link
  }
  
  @Public()
  @Post('paypal')
  async paypalWebhook(@Body() body) { ... }
}
```

#### [MODIFY] [billing.service.ts](file:///c:/temp/SentinelFi/backend/src/billing/billing.service.ts)
- [processPublicSubscription()](file:///c:/temp/SentinelFi/backend/src/billing/billing.service.ts#25-77): Save pending subscription → Initialize payment → Return URL only
- NEW `handlePaystackWebhook()`: Verify → Activate subscription → Create tenant → Send email
- NEW `handlePaypalWebhook()`: Same for PayPal
- Fix price: Always `1500 USD`. Paystack conversion: `1500 * liveNGNRate * 100` (Kobo)
- Inject [CurrencyService](file:///c:/temp/SentinelFi/backend/src/currency/currency.service.ts#7-272) to get live rate for NGN conversion

---

### Phase 5 — Missing Pages

#### [NEW] [pages/billing/success.tsx](file:///c:/temp/SentinelFi/frontend/pages/billing/success.tsx)
- Gateway returns here after payment
- Shows: "Payment received. Your workspace is being provisioned. Magic-link incoming."
- Polls a lightweight `GET /billing/subscription/status?ref=xxx` endpoint
- Once active, shows "Access Your Workspace" button

#### [NEW] [pages/auth/check-email.tsx](file:///c:/temp/SentinelFi/frontend/pages/auth/check-email.tsx)
- For trial signups (no payment redirect)
- Shows: "Check your inbox for your magic-link setup invitation"

#### [NEW] [pages/auth/setup.tsx](file:///c:/temp/SentinelFi/frontend/pages/auth/setup.tsx) *(if not exist)*
- Accepts invitation token from magic-link
- Lets user set password, verify email, complete onboarding

---

### Phase 6 — Subscription Management for Existing Users

**Problem**: There is zero UI for existing users to manage their subscription.

#### [NEW] `frontend/pages/settings/subscription.tsx`
- Shows: Current plan, status badge (active/trialing/expiring), renewal date, gateway used
- Actions: Renew, Upgrade to Annual (if on monthly), Cancel, Download Invoice

#### [NEW] Backend: `GET /billing/my-subscription`
- Authenticated endpoint returning current user's tenant subscription record

#### [NEW] Backend: `POST /billing/renew`
- Authenticated endpoint that re-initializes payment for renewal

---

## Verification Plan

### Automated
- Test `GET /currency/rates` returns 200 without auth token
- Test `POST /billing/process-public-subscription` → returns `paymentUrl` and creates `pending` subscription row
- Test Paystack webhook handler with mocked HMAC-SHA512 payload
- Test tenant is NOT provisioned before webhook confirms payment

### Manual
1. Visit `/landing/pricing` → Confirm live local currency equivalent displayed
2. Select a currency → Confirm price updates instantly
3. Click "Start Free Trial" → Complete checkout form → Confirm redirected correctly
4. Verify `/billing/success` page polls and shows correct state
5. Login as existing user → Navigate to Settings → Confirm subscription details visible
