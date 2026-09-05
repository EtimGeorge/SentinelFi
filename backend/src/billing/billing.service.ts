import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, LessThan } from "typeorm";
import {
  SubscriptionEntity,
  SubscriptionStatus,
  BillingCycle,
} from "./entities/subscription.entity";
import { TenantEntity } from "../tenants/tenant.entity";
import { BillingInvoiceEntity } from "./entities/billing-invoice.entity";
import { BillingOverviewDto } from "./dto/billing-overview.dto";
import { ProvisionOfflineTenantDto } from "./dto/provision-tenant.dto";
import { InvoiceDto, InvoiceStatus } from "./dto/invoice.dto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PaymentService } from "../payment/payment.service";
import { TenantService } from "../tenants/tenant.service";
import { InvitationService } from "../auth/invitation.service";
import { CurrencyService } from "../currency/currency.service";
import { PaymentProvider } from "../payment/interfaces/payment-strategy.interface";
import { Role } from "@shared/types/role.enum";
import { EmailService } from "../email/email.service";
import { WebhookService } from "./webhook.service";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import * as path from "path";
import { isCorporateEmail } from "@shared/utils/validation";

// ─── Pricing Constants ───────────────────────────────────────────────────────
export const PLAN_PRICING = {
  trial: { amount_usd: 0, days: 14, label: "Free Trial" },
  professional: { amount_usd: 1500, label: "Professional" },
  enterprise: { amount_usd: 0, label: "Enterprise (Contact Sales)" }, // Custom
};

const ANNUAL_DISCOUNT = 0.15; // 15% off annual

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(BillingInvoiceEntity)
    private readonly invoiceRepository: Repository<BillingInvoiceEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    private readonly paymentService: PaymentService,
    private readonly tenantService: TenantService,
    private readonly invitationService: InvitationService,
    private readonly currencyService: CurrencyService,
    private readonly emailService: EmailService,
    private readonly webhookService: WebhookService,
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
      throw new BadRequestException(
        "A corporate email address is required for provisioning.",
      );
    }

    // Prevent duplicate trial attempts
    const existingSub = await this.subscriptionRepository.findOne({
      where: { admin_email: data.email },
    });
    if (existingSub) {
      throw new BadRequestException(
        "An account with this email already exists. Please sign in or contact support.",
      );
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const schemaName = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, "_")
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
        plan: "trial",
        admin_first_name: data.firstName,
        admin_last_name: data.lastName,
        default_currency_code: "USD",
      });

      // Update tenant expires_at
      await queryRunner.manager.update(
        "tenants",
        { tenant_id: tenant.tenant_id },
        {
          expires_at: trialEndsAt,
          is_active: true,
          plan: "trial",
        },
      );

      // 2. Create Subscription
      const subscription = this.subscriptionRepository.create({
        tenant_id: tenant.tenant_id,
        plan: "trial",
        status: SubscriptionStatus.TRIALING,
        billing_cycle: BillingCycle.TRIAL,
        amount_usd: 0,
        gateway: "trial",
        admin_email: data.email,
        company_name: data.companyName,
        admin_first_name: data.firstName,
        admin_last_name: data.lastName,
        base_currency: "USD",
        trial_ends_at: trialEndsAt,
        current_period_start: new Date(),
        current_period_end: trialEndsAt,
      });

      await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      // 3. Dispatch magic-link invitation happens automatically in TenantService phase 3
      // 4. Send trial activation confirmation email
      const frontendUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://sentinelfi.com",
      );
      this.emailService
        .sendTrialActivationEmail(data.email, {
          firstName: data.firstName,
          companyName: data.companyName,
          adminEmail: data.email,
          trialStartDate: new Date().toDateString(),
          trialEndDate: trialEndsAt.toDateString(),
          pricingUrl: `${frontendUrl}/landing/pricing`,
        })
        .catch((err: Error) =>
          this.logger.error(
            `[BILLING] Trial activation email failed: ${err.message}`,
          ),
        );

      this.logger.log(
        `Trial provisioned for ${data.email}. Emails dispatching.`,
      );
      return {
        message: "Trial provisioned. Check your email for access.",
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
    this.logger.log(
      `Processing public subscription for ${data.email} (${data.plan})`,
    );

    if (!isCorporateEmail(data.email)) {
      throw new BadRequestException(
        "A corporate email address is required for provisioning.",
      );
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

    const frontendUrl = this.configService.get<string>("FRONTEND_URL");

    // Determine gateway amount — Paystack requires NGN Kobo, PayPal accepts USD cents
    let gatewayAmount: number;
    let gatewayCurrency: string;

    if (data.gateway === PaymentProvider.PAYSTACK) {
      // Convert USD → NGN using live rate, then × 100 for Kobo
      const { convertedAmount } = await this.currencyService.convertAmount(
        finalAmountUSD,
        "USD",
        "NGN",
      );
      gatewayAmount = Math.round(convertedAmount * 100); // Kobo
      gatewayCurrency = "NGN";
    } else {
      // PayPal: USD in cents
      gatewayAmount = Math.round(finalAmountUSD * 100);
      gatewayCurrency = "USD";
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
      base_currency: data.baseCurrency || "USD",
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
      message: "Payment initialized.",
      authorization_url: paymentResponse.authorizationUrl,
      reference: paymentResponse.reference,
      subscription_id: savedSub.id,
    };
  }

  // ─── WEBHOOK HANDLERS ────────────────────────────────────────────────────────

  /**
   * Handles verified Paystack charge.success webhook.
   * Leverages WebhookService for signature verification and idempotency.
   */
  async handlePaystackWebhook(
    rawBody: string,
    signature: string,
  ): Promise<void> {
    const isNew = await this.webhookService.verifyPaystack(rawBody, signature);
    if (!isNew) return; // Already processed

    const event = JSON.parse(rawBody);
    if (event.event !== "charge.success") return;

    const metadata = event.data?.metadata || {};
    const subscriptionId = metadata.subscription_id;

    if (!subscriptionId) {
      this.logger.warn(
        "[BILLING] Paystack webhook: no subscription_id in metadata",
      );
      return;
    }

    await this.activateSubscription(subscriptionId, event.data.reference);
  }

  /**
   * Handles verified PayPal PAYMENT.CAPTURE.COMPLETED webhook.
   * When PayPal credentials are configured, fully verifies via PayPal API; otherwise requires transmission headers.
   */
  async handlePaypalWebhook(
    body: any,
    headers?: {
      transmissionId?: string;
      transmissionTime?: string;
      certUrl?: string;
      authAlgo?: string;
      transmissionSig?: string;
      rawBody?: string;
    },
  ): Promise<void> {
    const isNew = await this.webhookService.verifyPaypal(body, headers);
    if (!isNew) return;

    if (body.event_type !== "PAYMENT.CAPTURE.COMPLETED") return;

    const subscriptionId =
      body.resource?.custom_id || body.resource?.purchase_units?.[0]?.custom_id;

    if (!subscriptionId) {
      this.logger.warn(
        "[BILLING] PayPal webhook: no subscription_id in payload",
      );
      return;
    }

    await this.activateSubscription(subscriptionId, body.resource?.id);
  }

  /**
   * Core activation logic — called by both webhook handlers.
   * Activates subscription, creates tenant, dispatches magic-link.
   */
  private async activateSubscription(
    subscriptionId: string,
    gatewayRef?: string,
  ): Promise<void> {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!sub) {
      this.logger.error(`Webhook: subscription ${subscriptionId} not found`);
      return;
    }

    if (sub.status === SubscriptionStatus.ACTIVE) {
      this.logger.warn(
        `Webhook: subscription ${subscriptionId} already active — ignoring duplicate`,
      );
      return; // Idempotent
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (sub.billing_cycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const schemaName = sub
      .company_name!.toLowerCase()
      .replace(/[^a-z0-9_]/gi, "_")
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
      await queryRunner.manager.update(
        "tenants",
        { tenant_id: tenant.tenant_id },
        {
          expires_at: periodEnd,
          is_active: true,
          plan: sub.plan,
        },
      );

      // 3. Activate subscription
      await queryRunner.manager.update(
        SubscriptionEntity,
        { id: sub.id },
        {
          status: SubscriptionStatus.ACTIVE,
          tenant_id: tenant.tenant_id,
          gateway_reference: gatewayRef || sub.gateway_reference,
          current_period_start: now,
          current_period_end: periodEnd,
        },
      );

      await queryRunner.commitTransaction();

      // 4. Dispatch magic-link happens automatically inside TenantService
      // 5. Send subscription success + receipt email with PDF invoice
      this.dispatchActivationEmails(sub, now, periodEnd, gatewayRef).catch(
        (err: Error) =>
          this.logger.error(
            `[BILLING] Post-activation emails failed for ${sub.admin_email}: ${err.message}`,
          ),
      );

      this.logger.log(
        `Subscription ${subscriptionId} activated for ${sub.admin_email}. Emails dispatching.`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to activate subscription ${subscriptionId}`,
        err,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Sends subscription success + receipt email (with PDF) after activation.
   * Runs async, decoupled from the main transaction.
   */
  private async dispatchActivationEmails(
    sub: SubscriptionEntity,
    activatedAt: Date,
    periodEnd: Date,
    gatewayRef?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "https://sentinelfi.com",
    );
    const invoiceNumber = `RCP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const amountFormatted = Number(sub.amount_usd).toFixed(2);
    const toEmail = sub.admin_email!;
    const firstName =
      sub.admin_first_name || sub.company_name || "Valued Client";

    // Generate PDF invoice for attachment
    let pdfBuffer: Buffer | undefined;
    try {
      const invoiceEntity = await this.invoiceRepository.findOne({
        where: { tenant_id: sub.tenant_id! },
        order: { created_at: "DESC" },
        relations: ["subscription"],
      });
      if (invoiceEntity) {
        pdfBuffer = await this.downloadInvoice(invoiceEntity.id);
      }
    } catch {
      this.logger.warn(
        "[BILLING] Could not generate PDF for receipt email — sending without attachment.",
      );
    }

    // Send payment receipt with PDF attachment
    await this.emailService.sendPaymentReceiptEmail(
      toEmail,
      {
        firstName,
        companyName: sub.company_name!,
        adminEmail: toEmail,
        invoiceNumber,
        plan: sub.plan,
        billingCycle: sub.billing_cycle,
        gateway: sub.gateway || "online",
        gatewayReference: gatewayRef || sub.gateway_reference || "N/A",
        amountFormatted,
        periodStart: activatedAt.toDateString(),
        periodEnd: periodEnd.toDateString(),
        dashboardUrl: `${frontendUrl}/dashboard`,
      },
      pdfBuffer,
    );

    // Send workspace provisioned confirmation
    await this.emailService.sendSubscriptionSuccessEmail(toEmail, {
      firstName,
      companyName: sub.company_name!,
      plan: sub.plan,
      billingCycle: sub.billing_cycle,
      periodEnd: periodEnd.toDateString(),
      dashboardUrl: `${frontendUrl}/dashboard`,
    });
  }

  /**
   * Handles payment failure webhooks — sends failure alert to customer.
   */
  async handlePaymentFailed(data: {
    email: string;
    firstName: string;
    companyName: string;
    plan: string;
    amountUsd: number;
    gateway: string;
    reference: string;
    reason: string;
  }): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "https://sentinelfi.com",
    );
    try {
      await this.emailService.sendPaymentFailureEmail(data.email, {
        firstName: data.firstName,
        companyName: data.companyName,
        plan: data.plan,
        amountFormatted: Number(data.amountUsd).toFixed(2),
        gateway: data.gateway,
        gatewayReference: data.reference,
        failureReason: data.reason,
        failureDate: new Date().toDateString(),
        retryUrl: `${frontendUrl}/landing/pricing`,
      });
      this.logger.log(`[BILLING] Payment failure alert sent to ${data.email}`);
    } catch (err) {
      this.logger.error(
        `[BILLING] Failed to send payment failure email to ${data.email}:`,
        err,
      );
    }
  }

  // ─── SUPERADMIN PROVISIONING ─────────────────────────────────────────────────

  /**
   * SuperAdmin bypasses the payment gateway entirely.
   * Provisions a tenant, creates an active subscription, dispatches magic-link.
   */
  async provisionTenantBySuperAdmin(
    data: ProvisionOfflineTenantDto,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`SuperAdmin provisioning tenant for ${data.adminEmail}`);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + data.months);

    const schemaName = data.companyName
      .toLowerCase()
      .replace(/[^a-z0-9_]/gi, "_")
      .slice(0, 63);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check for existing tenant to support RENEWAL/EXTENSION
      let tenant = await this.tenantRepository.findOne({
        where: { name: data.companyName },
      });

      if (tenant) {
        this.logger.log(
          `Existing tenant found for ${data.adminEmail}. Processing as RENEWAL.`,
        );

        // Calculate new expiry: max(now, current_expiry) + months
        const currentExpiry = tenant.expires_at
          ? new Date(tenant.expires_at)
          : now;
        const baseDate = currentExpiry > now ? currentExpiry : now;
        periodEnd.setTime(baseDate.getTime());
        periodEnd.setMonth(periodEnd.getMonth() + data.months);

        // Update tenant plan and expiry
        await queryRunner.manager.update(
          "tenants",
          { tenant_id: tenant.tenant_id },
          {
            expires_at: periodEnd,
            is_active: true,
            plan: data.plan,
          },
        );
      } else {
        this.logger.log(
          `No existing tenant found. Creating new tenant: ${data.companyName}`,
        );
        tenant = await this.tenantService.createTenant({
          name: data.companyName,
          schema_name: schemaName,
          admin_email: data.adminEmail,
          plan: data.plan,
        });

        await queryRunner.manager.update(
          "tenants",
          { tenant_id: tenant.tenant_id },
          {
            expires_at: periodEnd,
            is_active: true,
            plan: data.plan,
          },
        );
      }

      const subscription = this.subscriptionRepository.create({
        tenant_id: tenant.tenant_id,
        plan: data.plan,
        status: SubscriptionStatus.ACTIVE,
        billing_cycle: data.billingCycle,
        amount_usd: data.amountUsd,
        gateway: "superadmin",
        admin_email: data.adminEmail,
        company_name: data.companyName,
        current_period_start: now,
        current_period_end: periodEnd,
        payment_proof_text: data.paymentProofText || null,
        offline_bank_reference: data.offlineBankReference || null,
        payment_proof_url: file
          ? `/uploads/billing-receipts/${file.filename}`
          : null,
      });

      await queryRunner.manager.save(SubscriptionEntity, subscription);

      const invoice = new BillingInvoiceEntity();
      invoice.tenant_id = tenant.tenant_id;
      invoice.subscription_id = subscription.id;
      invoice.invoice_number = `INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      invoice.amount_usd = subscription.amount_usd;
      invoice.status = InvoiceStatus.Paid;
      invoice.due_date = now;
      invoice.paid_at = now;
      await queryRunner.manager.save(BillingInvoiceEntity, invoice);

      await queryRunner.commitTransaction();

      // Magic link happens automatically inside tenant service.
      // Send offline provisioning receipt email with PDF
      const feUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://sentinelfi.com",
      );
      this.generateAndSendOfflineReceipt(
        subscription,
        invoice,
        tenant,
        feUrl,
      ).catch((err: Error) =>
        this.logger.error(
          `[BILLING] Offline receipt email failed: ${err.message}`,
        ),
      );

      return {
        tenant_id: tenant.tenant_id,
        companyName: tenant.name,
        message: `Tenant ${tenant.name} ${tenant.expires_at ? "extended" : "provisioned"} for ${data.months} month(s). New expiry: ${periodEnd.toISOString()}`,
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
      order: { created_at: "DESC" },
    });

    if (!sub) {
      this.logger.warn(
        `[BillingService] No subscription found for tenant: ${tenantId}`,
      );
      throw new NotFoundException("No subscription found for this tenant.");
    }
    this.logger.debug(
      `[BillingService] Found subscription for tenant: ${tenantId}, Plan: ${sub.plan}`,
    );

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
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException("Subscription not found.");
    return { status: sub.status, tenant_id: sub.tenant_id };
  }

  // ─── SUPERADMIN OVERVIEW ─────────────────────────────────────────────────────

  async getAllTenantSubscriptions() {
    const subscriptions = await this.subscriptionRepository.find({
      order: { created_at: "DESC" },
    });

    const summary = {
      total: subscriptions.length,
      active: subscriptions.filter(
        (s) => s.status === SubscriptionStatus.ACTIVE,
      ).length,
      trialing: subscriptions.filter(
        (s) => s.status === SubscriptionStatus.TRIALING,
      ).length,
      expired: subscriptions.filter(
        (s) => s.status === SubscriptionStatus.EXPIRED,
      ).length,
      mrr_usd: subscriptions
        .filter(
          (s) =>
            s.status === SubscriptionStatus.ACTIVE &&
            s.billing_cycle === BillingCycle.MONTHLY,
        )
        .reduce((acc, s) => acc + Number(s.amount_usd), 0),
      arr_usd: subscriptions
        .filter(
          (s) =>
            s.status === SubscriptionStatus.ACTIVE &&
            s.billing_cycle === BillingCycle.ANNUAL,
        )
        .reduce((acc, s) => acc + Number(s.amount_usd), 0),
    };

    return { summary, subscriptions };
  }

  // ─── INVOICE (Legacy — Enhanced + real invoice generation) ───────────────────

  async getBillingOverview(): Promise<BillingOverviewDto> {
    const { summary } = await this.getAllTenantSubscriptions();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastSubscriptions = await this.subscriptionRepository.find({
      where: {
        created_at: LessThan(thirtyDaysAgo),
      },
    });

    const pastActive = pastSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    );
    const pastMrr = pastActive
      .filter((s) => s.billing_cycle === BillingCycle.MONTHLY)
      .reduce((acc, s) => acc + Number(s.amount_usd), 0);

    const mrrGrowthPercentage =
      pastMrr === 0
        ? summary.mrr_usd > 0
          ? 100
          : 0
        : ((summary.mrr_usd - pastMrr) / pastMrr) * 100;
    const subGrowthPercentage =
      pastActive.length === 0
        ? summary.active > 0
          ? 100
          : 0
        : ((summary.active - pastActive.length) / pastActive.length) * 100;

    return {
      totalMrr: summary.mrr_usd,
      activeSubscriptions: summary.active,
      pendingInvoices: summary.trialing,
      mrrGrowthPercentage: Number(mrrGrowthPercentage.toFixed(2)),
      subscriptionGrowthPercentage: Number(subGrowthPercentage.toFixed(2)),
    };
  }

  async getRecentInvoices(): Promise<InvoiceDto[]> {
    const invoices = await this.invoiceRepository.find({
      relations: ["subscription"],
      order: { created_at: "DESC" },
      take: 20,
    });

    return invoices.map((i) => ({
      id: i.id,
      tenantName: i.subscription?.company_name || "N/A",
      amount: Number(i.amount_usd),
      date: i.created_at,
      status: i.status as InvoiceStatus,
    }));
  }

  async downloadInvoice(invoiceId: string): Promise<Buffer> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ["subscription"],
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    const sub = invoice.subscription;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lightFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const teal = rgb(0.0, 0.64, 0.71); // #00A3B5
    const dark = rgb(0.1, 0.1, 0.15);
    const gray = rgb(0.44, 0.5, 0.56);
    const green = rgb(0.13, 0.55, 0.13);
    const white = rgb(1.0, 1.0, 1.0);

    // ── Header banner ───────────────────────────────────────────────────
    page.drawRectangle({
      x: 0,
      y: height - 110,
      width: 595,
      height: 110,
      color: rgb(0.0, 0.05, 0.09),
    });
    page.drawText("SENTINELFI", {
      x: 50,
      y: height - 55,
      font,
      size: 26,
      color: teal,
    });
    page.drawText("\u00ae", {
      x: 185,
      y: height - 42,
      font,
      size: 11,
      color: teal,
    });
    page.drawText("Financial Intelligence Platform", {
      x: 50,
      y: height - 76,
      font: bodyFont,
      size: 10,
      color: white,
    });
    page.drawText("TAX INVOICE", {
      x: 400,
      y: height - 50,
      font,
      size: 18,
      color: white,
    });
    page.drawText(invoice.invoice_number, {
      x: 400,
      y: height - 72,
      font: bodyFont,
      size: 10,
      color: rgb(0.6, 0.8, 0.85),
    });

    // ── Issuer block ────────────────────────────────────────────────────
    let y = height - 145;
    page.drawText("Issued By:", { x: 50, y, font, size: 9, color: gray });
    y -= 14;
    page.drawText("Seancrystal Global Services Limited", {
      x: 50,
      y,
      font,
      size: 11,
      color: dark,
    });
    y -= 14;
    page.drawText("Owner & Operator of SentinelFi\u00ae", {
      x: 50,
      y,
      font: lightFont,
      size: 9,
      color: gray,
    });
    y -= 12;
    page.drawText(
      "Funded by: Solution Energy and Engineering Services Limited",
      { x: 50, y, font: lightFont, size: 9, color: gray },
    );

    // ── Separator ───────────────────────────────────────────────────────
    y -= 18;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: teal,
    });
    y -= 20;

    // ── Invoice details table ────────────────────────────────────────────
    const rows: [string, string][] = [
      ["Invoice Number:", invoice.invoice_number],
      [
        "Date Issued:",
        invoice.paid_at?.toDateString() || new Date().toDateString(),
      ],
      ["Billed To (Company):", sub?.company_name || "N/A"],
      ["Admin Email:", sub?.admin_email || "N/A"],
      ["Plan:", (sub?.plan || "N/A").toUpperCase()],
      ["Billing Cycle:", sub?.billing_cycle || "N/A"],
      [
        "Subscription Period:",
        `${sub?.current_period_start?.toDateString() || "N/A"} \u2192 ${sub?.current_period_end?.toDateString() || "N/A"}`,
      ],
      ["Payment Gateway:", sub?.gateway || "N/A"],
      ["Amount (USD):", `$${Number(invoice.amount_usd).toFixed(2)}`],
      ["Status:", invoice.status.toUpperCase()],
    ];

    rows.forEach(([label, value]) => {
      page.drawText(label, { x: 50, y, font, size: 10, color: gray });
      page.drawText(value, {
        x: 230,
        y,
        font: bodyFont,
        size: 10,
        color: dark,
      });
      y -= 22;
    });

    // ── Amount highlight box ─────────────────────────────────────────────
    y -= 12;
    page.drawRectangle({
      x: 50,
      y: y - 10,
      width: 495,
      height: 44,
      color: rgb(0.93, 0.99, 0.99),
    });
    page.drawText("TOTAL AMOUNT DUE (USD)", {
      x: 58,
      y: y + 18,
      font,
      size: 9,
      color: gray,
    });
    page.drawText(`$${Number(invoice.amount_usd).toFixed(2)}`, {
      x: 390,
      y: y + 12,
      font,
      size: 18,
      color: teal,
    });

    // ── PAID stamp (if paid) ─────────────────────────────────────────────
    if (invoice.status === InvoiceStatus.Paid) {
      page.drawRectangle({
        x: 390,
        y: height - 195,
        width: 85,
        height: 30,
        color: rgb(0.13, 0.55, 0.13),
        borderColor: green,
        borderWidth: 1,
      });
      page.drawText("\u2714  PAID", {
        x: 397,
        y: height - 185,
        font,
        size: 12,
        color: white,
      });
    }

    // ── Footer ───────────────────────────────────────────────────────────
    page.drawLine({
      start: { x: 50, y: 80 },
      end: { x: 545, y: 80 },
      thickness: 0.5,
      color: teal,
    });
    page.drawText(
      "\u00a9 " +
        new Date().getFullYear() +
        " Seancrystal Global Services Limited. All rights reserved.",
      { x: 50, y: 62, font: bodyFont, size: 8, color: gray },
    );
    page.drawText(
      "SentinelFi\u00ae is a product of Seancrystal Global Services Limited. Funded by Solution Energy and Engineering Services Limited.",
      { x: 50, y: 48, font: lightFont, size: 7.5, color: gray },
    );
    page.drawText("For queries: support@sentinelfi.com", {
      x: 50,
      y: 34,
      font: bodyFont,
      size: 8,
      color: teal,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Helper: generate & send offline receipt email for SuperAdmin-provisioned tenants.
   */
  private async generateAndSendOfflineReceipt(
    subscription: SubscriptionEntity,
    invoice: BillingInvoiceEntity,
    tenant: TenantEntity,
    frontendUrl: string,
  ): Promise<void> {
    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await this.downloadInvoice(invoice.id);
    } catch {
      /* non-blocking */
    }

    await this.emailService.sendPaymentReceiptEmail(
      subscription.admin_email!,
      {
        firstName: subscription.admin_first_name || tenant.name,
        companyName: subscription.company_name!,
        adminEmail: subscription.admin_email!,
        invoiceNumber: invoice.invoice_number,
        plan: subscription.plan,
        billingCycle: subscription.billing_cycle,
        gateway: "Offline / Bank Transfer",
        gatewayReference:
          subscription.offline_bank_reference ||
          subscription.gateway_reference ||
          "N/A",
        amountFormatted: Number(subscription.amount_usd).toFixed(2),
        periodStart: subscription.current_period_start?.toDateString() || "N/A",
        periodEnd: subscription.current_period_end?.toDateString() || "N/A",
        dashboardUrl: `${frontendUrl}/dashboard`,
      },
      pdfBuffer,
    );
  }

  // ─── OFFLINE AUDIT PROOFS ────────────────────────────────────────────────────

  async getPaymentProofPath(subscriptionId: string): Promise<string> {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });
    if (!sub || !sub.payment_proof_url) {
      this.logger.warn(
        `No payment proof found for subscription ${subscriptionId}`,
      );
      throw new NotFoundException(
        "No payment proof file associated with this subscription.",
      );
    }

    // Convert relative URL stored in DB to an absolute file system path
    const absolutePath = path.join(process.cwd(), sub.payment_proof_url);
    return absolutePath;
  }

  // ─── TEAM INVITATION ─────────────────────────────────────────────────────────

  async inviteUser(
    email: string,
    role: Role,
    tenantId: string,
    firstName?: string,
    lastName?: string,
  ) {
    if (!isCorporateEmail(email)) {
      throw new BadRequestException(
        "A corporate email address is required for invitations.",
      );
    }
    const tenant = await this.tenantService.findOneTenant(tenantId);
    if (!tenant) throw new NotFoundException("Tenant not found");

    return this.invitationService.createInvitation(
      email,
      role,
      tenant,
      firstName,
      lastName,
    );
  }
}
