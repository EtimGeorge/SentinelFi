import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import { EmailProvider } from "./interfaces/email-provider.interface";
import { SmtpProvider } from "./providers/smtp.provider";
import { ResendProvider } from "./providers/resend.provider";

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

  constructor(private readonly configService: ConfigService) {}

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

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (
      this.configService.get<string>("NODE_ENV") === "development" &&
      this.configService.get<boolean>("EMAIL_PREVIEW_ONLY", true)
    ) {
      this.logger.warn(`[EMAIL PREVIEW] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.provider.sendEmail({ to, subject, html });
    } catch (error) {
      this.logger.error(
        `Failed to send email via ${this.provider.getName()}:`,
        error,
      );
      throw error;
    }
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; content: Buffer; contentType: string }[],
  ): Promise<void> {
    if (
      this.configService.get<string>("NODE_ENV") === "development" &&
      this.configService.get<boolean>("EMAIL_PREVIEW_ONLY", true)
    ) {
      this.logger.warn(
        `[EMAIL PREVIEW+ATTACH] To: ${to} | Subject: ${subject} | Files: ${attachments?.length ?? 0}`,
      );
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
    } catch (error) {
      this.logger.error(
        `Failed to send email with attachment via ${this.provider.getName()}:`,
        error,
      );
      throw error;
    }
  }

  async sendTemplatedEmail(
    to: string,
    subject: string,
    templateName: string,
    context: Record<string, any>,
  ): Promise<void> {
    const html = this.renderTemplate(templateName, context);
    await this.sendEmail(to, subject, html);
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
  ): Promise<void> {
    const subject = `Your SentinelFi® Receipt — ${context.invoiceNumber}`;
    const html = this.renderTemplate("payment-receipt", {
      ...context,
      hasAttachment: !!pdfBuffer,
    });
    if (pdfBuffer) {
      await this.sendEmailWithAttachment(to, subject, html, [
        {
          filename: `SentinelFi-Invoice-${context.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]);
    } else {
      await this.sendEmail(to, subject, html);
    }
    this.logger.log(
      `[EmailService] Receipt → ${to} (${context.invoiceNumber})`,
    );
  }

  async sendTrialActivationEmail(
    to: string,
    context: TrialActivationContext,
  ): Promise<void> {
    const subject = `Your SentinelFi® Free Trial is Live — Welcome, ${context.firstName}!`;
    await this.sendTemplatedEmail(to, subject, "trial-activation", context);
    this.logger.log(`[EmailService] Trial activation → ${to}`);
  }

  async sendSubscriptionSuccessEmail(
    to: string,
    context: SubscriptionSuccessContext,
  ): Promise<void> {
    const subject = `🎉 Your SentinelFi® ${context.plan} Workspace is Ready`;
    await this.sendTemplatedEmail(to, subject, "subscription-success", context);
    this.logger.log(`[EmailService] Subscription success → ${to}`);
  }

  async sendPaymentFailureEmail(
    to: string,
    context: PaymentFailedContext,
  ): Promise<void> {
    const subject = `⚠️ SentinelFi® Payment Failed — Action Required`;
    await this.sendTemplatedEmail(to, subject, "payment-failed", context);
    this.logger.log(`[EmailService] Payment failure → ${to}`);
  }

  async sendRenewalReminderEmail(
    to: string,
    context: RenewalReminderContext,
  ): Promise<void> {
    const subject = `⏰ SentinelFi® Subscription Expires ${context.daysLabel} — Renew Now`;
    await this.sendTemplatedEmail(to, subject, "renewal-reminder", context);
    this.logger.log(
      `[EmailService] Renewal reminder (${context.daysRemaining}d) → ${to}`,
    );
  }

  async sendSubscriptionRenewedEmail(
    to: string,
    context: SubscriptionRenewedContext,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    const subject = `✅ SentinelFi® Subscription Renewed — ${context.invoiceNumber}`;
    const html = this.renderTemplate("subscription-renewed", {
      ...context,
      hasAttachment: !!pdfBuffer,
    });
    if (pdfBuffer) {
      await this.sendEmailWithAttachment(to, subject, html, [
        {
          filename: `SentinelFi-Renewal-${context.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]);
    } else {
      await this.sendEmail(to, subject, html);
    }
    this.logger.log(`[EmailService] Renewal confirmed → ${to}`);
  }

  async sendTrialExpiryWarningEmail(
    to: string,
    context: TrialExpiryWarningContext,
  ): Promise<void> {
    const subject = `⏳ Your SentinelFi® Trial Ends in 3 Days — Don't Lose Access`;
    await this.sendTemplatedEmail(to, subject, "trial-expiry-warning", context);
    this.logger.log(`[EmailService] Trial expiry warning → ${to}`);
  }
}
