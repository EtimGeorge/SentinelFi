import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SubscriptionEntity, SubscriptionStatus, BillingCycle } from './entities/subscription.entity';
import { BillingOverviewDto } from './dto/billing-overview.dto';
import { InvoiceDto, InvoiceStatus } from './dto/invoice.dto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PaymentService } from '../payment/payment.service';
import { TenantService } from '../tenants/tenant.service';
import { InvitationService } from '../auth/invitation.service';
import { CurrencyService } from '../currency/currency.service';
import { PaymentProvider } from '../payment/interfaces/payment-strategy.interface';
import { Role } from '@shared/types/role.enum';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { isCorporateEmail } from '@shared/utils/validation';

// ─── Pricing Constants ───────────────────────────────────────────────────────
export const PLAN_PRICING = {
  trial: { amount_usd: 0, days: 14, label: 'Free Trial' },
  professional: { amount_usd: 1500, label: 'Professional' },
  enterprise: { amount_usd: 0, label: 'Enterprise (Contact Sales)' }, // Custom
};

const ANNUAL_DISCOUNT = 0.15; // 15% off annual

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    private readonly paymentService: PaymentService,
    private readonly tenantService: TenantService,
    private readonly invitationService: InvitationService,
    private readonly currencyService: CurrencyService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── TRIAL FLOW ─────────────────────────────────────────────────────────────

  /**
   * Instant trial provisioning — no payment gateway involved.
   * Creates tenant, subscription, and dispatches magic-link immediately.
   */
  async startFreeTrial(data: {
    email: string;
    companyName: string;
    firstName: string;
    lastName: string;
  }) {
    this.logger.log(`Starting free trial for ${data.email}`);

    if (!isCorporateEmail(data.email)) {
      throw new BadRequestException('A corporate email address is required for provisioning.');
    }

    // Prevent duplicate trial attempts
    const existingSub = await this.subscriptionRepository.findOne({
      where: { admin_email: data.email },
    });
    if (existingSub) {
      throw new BadRequestException(
        'An account with this email already exists. Please sign in or contact support.',
      );
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const schemaName = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, '_')
      .slice(0, 63);

    // Use transaction to keep tenant + subscription atomic
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tenant = await this.tenantService.createTenant({
        name: data.companyName,
        schema_name: schemaName,
        admin_email: data.email,
        plan: 'trial',
        admin_first_name: data.firstName,
        admin_last_name: data.lastName,
        default_currency_code: 'USD',
      });

      // Update tenant expires_at
      await queryRunner.manager.update('tenants', { tenant_id: tenant.tenant_id }, {
        expires_at: trialEndsAt,
        is_active: true,
        plan: 'trial',
      });

      // 2. Create Subscription
      const subscription = this.subscriptionRepository.create({
        tenant_id: tenant.tenant_id,
        plan: 'trial',
        status: SubscriptionStatus.TRIALING,
        billing_cycle: BillingCycle.TRIAL,
        amount_usd: 0,
        gateway: 'trial',
        admin_email: data.email,
        company_name: data.companyName,
        admin_first_name: data.firstName,
        admin_last_name: data.lastName,
        base_currency: 'USD',
        trial_ends_at: trialEndsAt,
        current_period_start: new Date(),
        current_period_end: trialEndsAt,
      });

      await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      // 3. Dispatch magic-link invitation happens automatically in TenantService phase 3

      this.logger.log(`Trial provisioned for ${data.email}. Magic-link dispatched.`);
      return {
        message: 'Trial provisioned. Check your email for access.',
        trialEndsAt,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Trial provisioning failed for ${data.email}`, err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── PAID SUBSCRIPTION FLOW ─────────────────────────────────────────────────

  /**
   * Step 1 of paid subscription.
   * Saves a PENDING subscription record, initializes payment, returns gateway URL.
   * Tenant is NOT created here — that happens in the webhook handler after payment confirmed.
   */
  async processPublicSubscription(data: {
    email: string;
    companyName: string;
    firstName: string;
    lastName: string;
    plan: string;
    billingCycle: BillingCycle;
    gateway: PaymentProvider;
    baseCurrency?: string;
  }) {
    this.logger.log(`Processing public subscription for ${data.email} (${data.plan})`);

    if (!isCorporateEmail(data.email)) {
      throw new BadRequestException('A corporate email address is required for provisioning.');
    }

    const planConfig = PLAN_PRICING[data.plan as keyof typeof PLAN_PRICING];
    if (!planConfig || planConfig.amount_usd === 0) {
      throw new BadRequestException(`Invalid plan: ${data.plan}`);
    }

    const baseAmountUSD = planConfig.amount_usd;
    const finalAmountUSD =
      data.billingCycle === BillingCycle.ANNUAL
        ? baseAmountUSD * 12 * (1 - ANNUAL_DISCOUNT)
        : baseAmountUSD;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Determine gateway amount — Paystack requires NGN Kobo, PayPal accepts USD cents
    let gatewayAmount: number;
    let gatewayCurrency: string;

    if (data.gateway === PaymentProvider.PAYSTACK) {
      // Convert USD → NGN using live rate, then × 100 for Kobo
      const { convertedAmount } = await this.currencyService.convertAmount(
        finalAmountUSD,
        'USD',
        'NGN',
      );
      gatewayAmount = Math.round(convertedAmount * 100); // Kobo
      gatewayCurrency = 'NGN';
    } else {
      // PayPal: USD in cents
      gatewayAmount = Math.round(finalAmountUSD * 100);
      gatewayCurrency = 'USD';
    }

    // Create PENDING subscription BEFORE calling gateway
    const pendingSub = this.subscriptionRepository.create({
      plan: data.plan,
      status: SubscriptionStatus.PENDING,
      billing_cycle: data.billingCycle,
      amount_usd: finalAmountUSD,
      gateway: data.gateway,
      admin_email: data.email,
      company_name: data.companyName,
      admin_first_name: data.firstName,
      admin_last_name: data.lastName,
      base_currency: data.baseCurrency || 'USD',
    });
    const savedSub = await this.subscriptionRepository.save(pendingSub);

    // Initialize payment with gateway
    const paymentResponse = await this.paymentService.initializePayment(
      {
        email: data.email,
        amount: gatewayAmount,
        currency: gatewayCurrency,
        callbackUrl: `${frontendUrl}/billing/success?ref=${savedSub.id}`,
        metadata: {
          subscription_id: savedSub.id,
          plan: data.plan,
          company_name: data.companyName,
          billing_cycle: data.billingCycle,
        },
      },
      data.gateway,
    );

    // Update subscription with gateway reference
    await this.subscriptionRepository.update(savedSub.id, {
      gateway_reference: paymentResponse.reference,
    });

    return {
      message: 'Payment initialized.',
      authorization_url: paymentResponse.authorizationUrl,
      reference: paymentResponse.reference,
      subscription_id: savedSub.id,
    };
  }

  // ─── WEBHOOK HANDLERS ────────────────────────────────────────────────────────

  /**
   * Handles verified Paystack charge.success webhook.
   * THIS is where tenant provisioning and invitation dispatch happen.
   */
  async handlePaystackWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const expectedSig = crypto
      .createHmac('sha512', secret!)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      this.logger.warn('Paystack webhook signature mismatch — rejecting');
      throw new ForbiddenException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    if (event.event !== 'charge.success') return; // Ignore non-payment events

    const metadata = event.data.metadata || {};
    const subscriptionId = metadata.subscription_id;

    if (!subscriptionId) {
      this.logger.warn('Paystack webhook: no subscription_id in metadata');
      return;
    }

    await this.activateSubscription(subscriptionId, event.data.reference);
  }

  /**
   * Handles verified PayPal PAYMENT.CAPTURE.COMPLETED webhook.
   */
  async handlePaypalWebhook(body: any): Promise<void> {
    if (body.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return;

    const subscriptionId =
      body.resource?.custom_id || body.resource?.purchase_units?.[0]?.custom_id;

    if (!subscriptionId) {
      this.logger.warn('PayPal webhook: no subscription_id in payload');
      return;
    }

    await this.activateSubscription(subscriptionId, body.resource?.id);
  }

  /**
   * Core activation logic — called by both webhook handlers.
   * Activates subscription, creates tenant, dispatches magic-link.
   */
  private async activateSubscription(subscriptionId: string, gatewayRef?: string): Promise<void> {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!sub) {
      this.logger.error(`Webhook: subscription ${subscriptionId} not found`);
      return;
    }

    if (sub.status === SubscriptionStatus.ACTIVE) {
      this.logger.warn(`Webhook: subscription ${subscriptionId} already active — ignoring duplicate`);
      return; // Idempotent
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (sub.billing_cycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const schemaName = sub.company_name!
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, '_')
      .slice(0, 63);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Tenant now that payment is confirmed
      const tenant = await this.tenantService.createTenant({
        name: sub.company_name!,
        schema_name: schemaName,
        admin_email: sub.admin_email!,
        plan: sub.plan,
        admin_first_name: sub.admin_first_name,
        admin_last_name: sub.admin_last_name,
        default_currency_code: sub.base_currency,
      });

      // 2. Set tenant expiry from subscription period end
      await queryRunner.manager.update('tenants', { tenant_id: tenant.tenant_id }, {
        expires_at: periodEnd,
        is_active: true,
        plan: sub.plan,
      });

      // 3. Activate subscription
      await queryRunner.manager.update(SubscriptionEntity, { id: sub.id }, {
        status: SubscriptionStatus.ACTIVE,
        tenant_id: tenant.tenant_id,
        gateway_reference: gatewayRef || sub.gateway_reference,
        current_period_start: now,
        current_period_end: periodEnd,
      });

      await queryRunner.commitTransaction();

      // 4. Dispatch magic-link happens automatically inside TenantService

      this.logger.log(`Subscription ${subscriptionId} activated for ${sub.admin_email}. Tenant created. Magic-link dispatched.`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to activate subscription ${subscriptionId}`, err);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── SUPERADMIN PROVISIONING ─────────────────────────────────────────────────

  /**
   * SuperAdmin bypasses the payment gateway entirely.
   * Provisions a tenant, creates an active subscription, dispatches magic-link.
   */
  async provisionTenantBySuperAdmin(data: {
    companyName: string;
    adminEmail: string;
    plan: string;
    billingCycle: BillingCycle;
    amountUsd: number;
    months: number;
  }) {
    this.logger.log(`SuperAdmin provisioning tenant for ${data.adminEmail}`);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + data.months);

    const schemaName = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, '_')
      .slice(0, 63);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tenant = await this.tenantService.createTenant({
        name: data.companyName,
        schema_name: schemaName,
        admin_email: data.adminEmail,
        plan: data.plan,
      });

      await queryRunner.manager.update('tenants', { tenant_id: tenant.tenant_id }, {
        expires_at: periodEnd,
        is_active: true,
        plan: data.plan,
      });

      const subscription = this.subscriptionRepository.create({
        tenant_id: tenant.tenant_id,
        plan: data.plan,
        status: SubscriptionStatus.ACTIVE,
        billing_cycle: data.billingCycle,
        amount_usd: data.amountUsd,
        gateway: 'superadmin',
        admin_email: data.adminEmail,
        company_name: data.companyName,
        current_period_start: now,
        current_period_end: periodEnd,
      });

      await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      // Magic link happens automatically inside tenant service. 

      return {
        tenant,
        message: `Tenant provisioned for ${data.months} month(s). Magic-link dispatched to ${data.adminEmail}.`,
        periodEnd,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── MY SUBSCRIPTION (AUTHENTICATED USER) ────────────────────────────────────

  async getMySubscription(tenantId: string) {
    const sub = await this.subscriptionRepository.findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    if (!sub) {
      this.logger.warn(`[BillingService] No subscription found for tenant: ${tenantId}`);
      throw new NotFoundException('No subscription found for this tenant.');
    }
    this.logger.debug(`[BillingService] Found subscription for tenant: ${tenantId}, Plan: ${sub.plan}`);

    const now = new Date();
    const periodEnd = sub.trial_ends_at || sub.current_period_end;
    const daysRemaining = periodEnd
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      plan: sub.plan,
      status: sub.status,
      billing_cycle: sub.billing_cycle,
      amount_usd: Number(sub.amount_usd),
      gateway: sub.gateway,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      trial_ends_at: sub.trial_ends_at,
      cancelled_at: sub.cancelled_at,
      days_remaining: daysRemaining,
      is_expiring_soon: daysRemaining !== null && daysRemaining <= 30,
    };
  }

  async getSubscriptionStatus(subscriptionId: string) {
    const sub = await this.subscriptionRepository.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found.');
    return { status: sub.status, tenant_id: sub.tenant_id };
  }

  // ─── SUPERADMIN OVERVIEW ─────────────────────────────────────────────────────

  async getAllTenantSubscriptions() {
    const subscriptions = await this.subscriptionRepository.find({
      order: { created_at: 'DESC' },
    });

    const summary = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).length,
      trialing: subscriptions.filter(s => s.status === SubscriptionStatus.TRIALING).length,
      expired: subscriptions.filter(s => s.status === SubscriptionStatus.EXPIRED).length,
      mrr_usd: subscriptions
        .filter(s => s.status === SubscriptionStatus.ACTIVE && s.billing_cycle === BillingCycle.MONTHLY)
        .reduce((acc, s) => acc + Number(s.amount_usd), 0),
      arr_usd: subscriptions
        .filter(s => s.status === SubscriptionStatus.ACTIVE && s.billing_cycle === BillingCycle.ANNUAL)
        .reduce((acc, s) => acc + Number(s.amount_usd), 0),
    };

    return { summary, subscriptions };
  }

  // ─── INVOICE (Legacy — Enhanced + real invoice generation) ───────────────────

  async getBillingOverview(): Promise<BillingOverviewDto> {
    const { summary } = await this.getAllTenantSubscriptions();
    return {
      totalMrr: summary.mrr_usd,
      activeSubscriptions: summary.active,
      pendingInvoices: summary.trialing,
      mrrGrowthPercentage: 0, // Requires historical data — implement later
      subscriptionGrowthPercentage: 0,
    };
  }

  async getRecentInvoices(): Promise<InvoiceDto[]> {
    const subs = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return subs.map((s) => ({
      id: s.id,
      tenantName: s.company_name || 'Unknown',
      amount: Number(s.amount_usd),
      date: s.created_at,
      status: InvoiceStatus.Paid,
    }));
  }

  async downloadInvoice(invoiceId: string): Promise<Buffer> {
    const sub = await this.subscriptionRepository.findOne({ where: { id: invoiceId } });
    if (!sub) throw new NotFoundException('Invoice not found');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const teal = rgb(0.05, 0.58, 0.53);
    const dark = rgb(0.1, 0.1, 0.15);

    page.drawText('SENTINELFI', { x: 50, y: height - 60, font, size: 22, color: teal });
    page.drawText('Financial Intelligence Platform', { x: 50, y: height - 80, font: bodyFont, size: 10, color: dark });
    page.drawText('TAX INVOICE', { x: 400, y: height - 60, font, size: 16, color: dark });

    page.drawLine({ start: { x: 50, y: height - 100 }, end: { x: 545, y: height - 100 }, thickness: 1, color: teal });

    const rows = [
      ['Invoice ID:', sub.id],
      ['Company:', sub.company_name || 'N/A'],
      ['Admin Email:', sub.admin_email || 'N/A'],
      ['Plan:', sub.plan.toUpperCase()],
      ['Billing Cycle:', sub.billing_cycle],
      ['Period:', `${sub.current_period_start?.toDateString() || 'N/A'} → ${sub.current_period_end?.toDateString() || 'N/A'}`],
      ['Status:', sub.status.toUpperCase()],
      ['Amount (USD):', `$${Number(sub.amount_usd).toFixed(2)}`],
    ];

    rows.forEach(([label, value], i) => {
      page.drawText(label, { x: 50, y: height - 140 - i * 25, font, size: 11, color: dark });
      page.drawText(value, { x: 200, y: height - 140 - i * 25, font: bodyFont, size: 11, color: dark });
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // ─── TEAM INVITATION ─────────────────────────────────────────────────────────

  async inviteUser(email: string, role: Role, tenantId: string, firstName?: string, lastName?: string) {
    if (!isCorporateEmail(email)) {
      throw new BadRequestException('A corporate email address is required for invitations.');
    }
    const tenant = await this.tenantService.findOneTenant(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.invitationService.createInvitation(email, role, tenant, firstName, lastName);
  }
}
