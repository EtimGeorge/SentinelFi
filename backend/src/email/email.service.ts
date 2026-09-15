import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import { EmailProvider } from "./interfaces/email-provider.interface";
import { SmtpProvider } from "./providers/smtp.provider";
import { ResendProvider } from "./providers/resend.provider";
import { EmailLogEntity, EmailLogStatus } from "./email-log.entity";
import { EmailStatsResponse } from "@shared/types/email";

/**
 * Extra context attached to a send for the email audit trail.
 */
export interface EmailMeta {
  template?: string;
  tenantId?: string | null;
}

export { EmailStatsResponse };

// ─── Context DTOs ─────────────────────────────────────────────────────────────

export interface PaymentReceiptContext {
  firstName: string;
  companyName: string;
  adminEmail: string;
  invoiceNumber: string;
  plan: string;
  billingCycle: string;
  gateway: string;
  gatewayReference: string;
  amountFormatted: string;
  periodStart: string;
  periodEnd: string;
  hasAttachment?: boolean;
  dashboardUrl: string;
}

export interface TrialActivationContext {
  firstName: string;
  companyName: string;
  adminEmail: string;
  trialStartDate: string;
  trialEndDate: string;
  pricingUrl: string;
}

export interface SubscriptionSuccessContext {
  firstName: string;
  companyName: string;
  plan: string;
  billingCycle: string;
  periodEnd: string;
  dashboardUrl: string;
}

export interface PaymentFailedContext {
  firstName: string;
  companyName: string;
  plan: string;
  amountFormatted: string;
  gateway: string;
  gatewayReference: string;
  failureReason: string;
  failureDate: string;
  retryUrl: string;
}

export interface RenewalReminderContext {
  firstName: string;
  companyName: string;
  plan: string;
  billingCycle: string;
  daysRemaining: number;
  daysLabel: string;
  expiryDate: string;
  renewalAmountFormatted: string;
  renewUrl: string;
}

export interface SubscriptionRenewedContext {
  firstName: string;
  companyName: string;
  invoiceNumber: string;
  plan: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  amountFormatted: string;
  gatewayReference: string;
  hasAttachment?: boolean;
  dashboardUrl: string;
}

export interface TrialExpiryWarningContext {
  firstName: string;
  companyName: string;
  trialEndDate: string;
  pricingUrl: string;
}

export interface WelcomeEmailContext {
  firstName: string;
  companyName: string;
  dashboardUrl: string;
  pricingUrl: string;
}

export interface EmailVerificationContext {
  firstName: string;
  verificationUrl: string;
  expiryHours: number;
}

export interface SubscriptionReactivatedContext {
  firstName: string;
  companyName: string;
  plan: string;
  dashboardUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private provider!: EmailProvider;
  private readonly templatesDir = path.join(
    process.cwd(),
    "src/email/templates",
  );
  private layoutTemplate!: Handlebars.TemplateDelegate;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: Repository<EmailLogEntity>,
  ) {}

  onModuleInit() {
    this.initializeProvider();
    this.initializeTemplates();
  }

  private initializeProvider() {
    const providerType = this.configService
      .get<string>("EMAIL_PROVIDER", "resend")
      .toLowerCase();
    this.provider =
      providerType === "smtp"
        ? new SmtpProvider(this.configService)
        : new ResendProvider(this.configService);
    this.logger.log(
      `Email Service initialized with [${this.provider.getName()}] provider.`,
    );
  }

  private initializeTemplates() {
    try {
      const layoutPath = path.join(this.templatesDir, "layout.hbs");
      if (fs.existsSync(layoutPath)) {
        const source = fs.readFileSync(layoutPath, "utf8");
        this.layoutTemplate = Handlebars.compile(source);
      } else {
        this.logger.warn("Email layout template not found. Using raw bodies.");
      }
    } catch (err) {
      this.logger.error("Failed to initialize email templates:", err);
    }
  }

  // ─── Core Send Methods ────────────────────────────────────────────────────

  private isPreviewOnly(): boolean {
    return (
      this.configService.get<string>("NODE_ENV") === "development" &&
      this.configService.get<boolean>("EMAIL_PREVIEW_ONLY", true)
    );
  }

  /**
   * Fire-and-forget write to the email audit trail. Never blocks the send path.
   */
  private persist(
    entry: {
      to: string;
      subject: string;
      template: string | null;
      tenantId: string | null | undefined;
      status: EmailLogStatus;
      errorMessage: string | null;
    },
  ): void {
    this.emailLogRepository
      .save(
        this.emailLogRepository.create({
          to: entry.to,
          subject: entry.subject,
          template: entry.template ?? null,
          tenantId: entry.tenantId ?? null,
          provider: this.provider?.getName?.() ?? "unknown",
          status: entry.status,
          errorMessage: entry.errorMessage,
        }),
      )
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to persist email log entry (${entry.status} → ${entry.to}):`,
          err instanceof Error ? err.message : String(err),
        ),
      );
  }

  private errorToMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    metadata?: EmailMeta,
  ): Promise<void> {
    if (this.isPreviewOnly()) {
      this.logger.warn(`[EMAIL PREVIEW] To: ${to} | Subject: ${subject}`);
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "preview",
        errorMessage: null,
      });
      return;
    }
    try {
      await this.provider.sendEmail({ to, subject, html });
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "sent",
        errorMessage: null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email via ${this.provider.getName()}:`,
        error,
      );
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "failed",
        errorMessage: this.errorToMessage(error),
      });
      throw error;
    }
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer; contentType: string }[],
    metadata?: EmailMeta,
  ): Promise<void> {
    if (this.isPreviewOnly()) {
      this.logger.warn(
        `[EMAIL PREVIEW+ATTACH] To: ${to} | Subject: ${subject} | Files: ${attachments?.length ?? 0}`,
      );
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "preview",
        errorMessage: null,
      });
      return;
    }
    try {
      if (
        typeof (this.provider as any).sendEmailWithAttachment === "function"
      ) {
        await (this.provider as any).sendEmailWithAttachment({
          to,
          subject,
          html,
          attachments,
        });
      } else {
        this.logger.warn(
          `Provider '${this.provider.getName()}' does not support attachments. Sending without PDF.`,
        );
        await this.provider.sendEmail({ to, subject, html });
      }
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "sent",
        errorMessage: null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email with attachment via ${this.provider.getName()}:`,
        error,
      );
      this.persist({
        to,
        subject,
        template: metadata?.template ?? null,
        tenantId: metadata?.tenantId ?? null,
        status: "failed",
        errorMessage: this.errorToMessage(error),
      });
      throw error;
    }
  }

  async sendTemplatedEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, any>,
    metadata?: EmailMeta,
  ): Promise<void> {
    const html = this.renderTemplate(templateName, context);
    await this.sendEmail(to, subject, html, {
      template: metadata?.template ?? templateName,
      tenantId: metadata?.tenantId ?? null,
    });
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): string {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath))
      throw new Error(`Email template not found: ${templateName}`);

    const source = fs.readFileSync(templatePath, "utf8");
    const bodyHtml = Handlebars.compile(source)(context);
    const appUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "https://sentinelfi.com",
    );

    return this.layoutTemplate
      ? this.layoutTemplate({
          body: bodyHtml,
          year: new Date().getFullYear(),
          appUrl,
          ...context,
        })
      : bodyHtml;
  }

  // ─── Typed Billing Email Helpers ─────────────────────────────────────────

  async sendPaymentReceiptEmail(
    to: string,
    context: PaymentReceiptContext,
    pdfBuffer?: Buffer,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `Your SentinelFi® Receipt — ${context.invoiceNumber}`;
    const html = this.renderTemplate("payment-receipt", {
      ...context,
      hasAttachment: !!pdfBuffer,
    });
    const logMeta: EmailMeta = { template: "payment-receipt", tenantId: metadata?.tenantId ?? null };
    if (pdfBuffer) {
      await this.sendEmailWithAttachment(to, subject, html, [
        {
          filename: `SentinelFi-Invoice-${context.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ], logMeta);
    } else {
      await this.sendEmail(to, subject, html, logMeta);
    }
    this.logger.log(
      `[EmailService] Receipt → ${to} (${context.invoiceNumber})`,
    );
  }

  async sendTrialActivationEmail(
    to: string,
    context: TrialActivationContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `Your SentinelFi® Free Trial is Live — Welcome, ${context.firstName}!`;
    await this.sendTemplatedEmail(to, subject, "trial-activation", context, {
      template: "trial-activation",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(`[EmailService] Trial activation → ${to}`);
  }

  async sendSubscriptionSuccessEmail(
    to: string,
    context: SubscriptionSuccessContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `🎉 Your SentinelFi® ${context.plan} Workspace is Ready`;
    await this.sendTemplatedEmail(to, subject, "subscription-success", context, {
      template: "subscription-success",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(`[EmailService] Subscription success → ${to}`);
  }

  async sendPaymentFailureEmail(
    to: string,
    context: PaymentFailedContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `⚠️ SentinelFi® Payment Failed — Action Required`;
    await this.sendTemplatedEmail(to, subject, "payment-failed", context, {
      template: "payment-failed",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(`[EmailService] Payment failure → ${to}`);
  }

  async sendRenewalReminderEmail(
    to: string,
    context: RenewalReminderContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `⏰ SentinelFi® Subscription Expires ${context.daysLabel} — Renew Now`;
    await this.sendTemplatedEmail(to, subject, "renewal-reminder", context, {
      template: "renewal-reminder",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(
      `[EmailService] Renewal reminder (${context.daysRemaining}d) → ${to}`,
    );
  }

  async sendSubscriptionRenewedEmail(
    to: string,
    context: SubscriptionRenewedContext,
    pdfBuffer?: Buffer,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `✅ SentinelFi® Subscription Renewed — ${context.invoiceNumber}`;
    const html = this.renderTemplate("subscription-renewed", {
      ...context,
      hasAttachment: !!pdfBuffer,
    });
    const logMeta: EmailMeta = { template: "subscription-renewed", tenantId: metadata?.tenantId ?? null };
    if (pdfBuffer) {
      await this.sendEmailWithAttachment(to, subject, html, [
        {
          filename: `SentinelFi-Renewal-${context.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ], logMeta);
    } else {
      await this.sendEmail(to, subject, html, logMeta);
    }
    this.logger.log(`[EmailService] Renewal confirmed → ${to}`);
  }

  async sendTrialExpiryWarningEmail(
    to: string,
    context: TrialExpiryWarningContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `⏳ Your SentinelFi® Trial Ends in 3 Days — Don't Lose Access`;
    await this.sendTemplatedEmail(to, subject, "trial-expiry-warning", context, {
      template: "trial-expiry-warning",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(`[EmailService] Trial expiry warning → ${to}`);
  }

  /**
   * Free-plan welcome — sent via Resend immediately after provisioning.
   * Points the admin at the dashboard + upgrade path.
   */
  async sendWelcomeEmail(
    to: string,
    context: WelcomeEmailContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `Welcome to SentinelFi® Free — Your Workspace is Ready`;
    await this.sendTemplatedEmail(to, subject, "welcome-free", context, {
      template: "welcome-free",
      tenantId: metadata?.tenantId ?? null,
    });
    this.logger.log(`[EmailService] Welcome (free) → ${to}`);
  }

  /**
   * Registration email-verification — magic-link style token URL.
   * Sent during signup before workspace access is granted.
   */
  async sendEmailVerificationEmail(
    to: string,
    context: EmailVerificationContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `Verify your SentinelFi® email — Action Required`;
    await this.sendTemplatedEmail(
      to,
      subject,
      "email-verification",
      context,
      {
        template: "email-verification",
        tenantId: metadata?.tenantId ?? null,
      },
    );
    this.logger.log(`[EmailService] Verification → ${to}`);
  }

  /**
   * Plan activation / reactivation confirmation — paid or free.
   */
  async sendSubscriptionReactivatedEmail(
    to: string,
    context: SubscriptionReactivatedContext,
    metadata?: EmailMeta,
  ): Promise<void> {
    const subject = `✅ Your SentinelFi® ${context.plan} Workspace is Active Again`;
    await this.sendTemplatedEmail(
      to,
      subject,
      "subscription-reactivated",
      context,
      {
        template: "subscription-reactivated",
        tenantId: metadata?.tenantId ?? null,
      },
    );
    this.logger.log(`[EmailService] Reactivation → ${to}`);
  }

  // ─── Email Audit Statistics ─────────────────────────────────────────────

  /**
   * Aggregate email stats over the last `days` (1..365).
   * Used by the SuperAdmin portal to reason about deliverability and traffic.
   */
  async getEmailStats(days = 30): Promise<EmailStatsResponse> {
    const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
    const since = new Date(Date.now() - safeDays * 86_400_000);

    const [totals, byTemplate, daily, uniqueRows, last] = await Promise.all([
      this.emailLogRepository.query(
        `SELECT status, COUNT(*)::int AS cnt
           FROM "public"."email_log"
          WHERE sent_at >= $1
          GROUP BY status`,
        [since],
      ),
      this.emailLogRepository.query(
        `SELECT COALESCE(template, '(none)') AS template,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'preview')::int AS preview
           FROM "public"."email_log"
          WHERE sent_at >= $1
          GROUP BY template
          ORDER BY total DESC`,
        [since],
      ),
      this.emailLogRepository.query(
        `SELECT to_char(date_trunc('day', sent_at), 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
           FROM "public"."email_log"
          WHERE sent_at >= $1
          GROUP BY 1
          ORDER BY day ASC`,
        [since],
      ),
      this.emailLogRepository.query(
        `SELECT COUNT(DISTINCT ("to"))::int AS cnt
           FROM "public"."email_log"
          WHERE sent_at >= $1`,
        [since],
      ),
      this.emailLogRepository.findOne({
        where: { status: "sent" },
        order: { sentAt: "DESC" },
        select: { id: true, sentAt: true },
      }),
    ]);

    const counts: Record<string, number> = { sent: 0, failed: 0, preview: 0 };
    for (const row of (totals as { status: string; cnt: number }[]) ?? []) {
      counts[row.status] = row.cnt;
    }
    const sent = counts.sent ?? 0;
    const failed = counts.failed ?? 0;
    const preview = counts.preview ?? 0;

    return {
      days: safeDays,
      totals: { total: sent + failed + preview, sent, failed, preview },
      deliveryRate:
        sent + failed > 0 ? Math.round((sent / (sent + failed)) * 1000) / 10 : null,
      uniqueRecipients: (uniqueRows?.[0]?.cnt as number) ?? 0,
      lastSentAt: last?.sentAt ?? null,
      byTemplate: (byTemplate as EmailStatsResponse["byTemplate"]) ?? [],
      daily: this.fillDailySeries(daily as { day: string; total: number; sent: number; failed: number }[], since),
    };
  }

  private fillDailySeries(
    rows: { day: string; total: number; sent: number; failed: number }[],
    since: Date,
  ): EmailStatsResponse["daily"] {
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const out: EmailStatsResponse["daily"] = [];
    const cursor = new Date(since);
    const today = new Date();
    closestStart: for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      out.push(byDay.get(key) ?? { day: key, total: 0, sent: 0, failed: 0 });
      cursor.setDate(cursor.getDate() + 1);
      if (cursor > today) break closestStart;
    }
    return out;
  }
}
