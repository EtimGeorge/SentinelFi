import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { NotificationsGateway } from "./notifications.gateway";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  sendUnreadCountUpdate(count: number, userId?: string) {
    this.logger.log(
      `Sending unread count update: ${count} for user: ${userId || "all"}`,
    );
    this.notificationsGateway.emitUnreadCountUpdate(count);
  }

  sendVarianceAlert(title: string, message: string, type: string = "warning") {
    this.logger.log(`Variance alert triggered: ${title} - ${message}`);
    this.notificationsGateway.emitVarianceAlert({ title, message, type });
  }

  /**
   * Broadcast in real-time when a senior authorizer APPROVES a budget overrun.
   */
  sendOverrideApprovedAlert(params: {
    authorizer: string;
    wbsCode: string;
    projectName: string;
    amount: number;
    varianceFlag: string;
    overrideReason: string;
    expenseId?: string;
  }) {
    const {
      authorizer,
      wbsCode,
      projectName,
      amount,
      varianceFlag,
      overrideReason,
    } = params;
    const title = `Budget Override Approved — ${varianceFlag.replace(/_/g, " ")}`;
    const message = `${authorizer} authorized a ${varianceFlag === "CRITICAL_VARIANCE" ? "CRITICAL" : "MAJOR"} overrun on WBS ${wbsCode} (${projectName}). Amount: ${amount.toLocaleString("en-NG", { style: "currency", currency: "NGN" })}. Reason: "${overrideReason}".`;
    const type =
      varianceFlag === "CRITICAL_VARIANCE"
        ? "critical_override"
        : "major_override";

    this.logger.warn(`[Override Approved] ${title}: ${message}`);
    this.notificationsGateway.emitVarianceAlert({
      title,
      message,
      type,
      metadata: params,
    });
  }

  // ─── Billing / Payment Event Notifications ───────────────────────────────

  /** Broadcasts real-time payment success after Paystack/PayPal webhook confirms. */
  sendPaymentSuccessNotification(params: {
    tenantId: string;
    companyName: string;
    plan: string;
    amountUsd: number;
    periodEnd: Date;
  }) {
    const { tenantId, companyName, plan, amountUsd, periodEnd } = params;
    this.logger.log(
      `[Billing] Payment success notification → tenant ${tenantId}`,
    );
    this.notificationsGateway.emitVarianceAlert({
      title: "✅ Payment Confirmed",
      message: `Workspace for ${companyName} activated on the ${plan} plan. Receipt dispatched. Valid until ${periodEnd.toDateString()}.`,
      type: "payment_success",
      metadata: { tenantId, plan, amountUsd, periodEnd },
    });
  }

  /** Broadcasts real-time payment failure alert after a failed webhook. */
  sendPaymentFailureNotification(params: {
    email: string;
    plan: string;
    reason: string;
  }) {
    const { email, plan, reason } = params;
    this.logger.warn(`[Billing] Payment failure notification → ${email}`);
    this.notificationsGateway.emitVarianceAlert({
      title: "⚠️ Payment Failed",
      message: `Payment for ${plan} plan (${email}) failed. Reason: ${reason}. Alert email dispatched.`,
      type: "payment_failure",
      metadata: { email, plan, reason },
    });
  }

  /** Broadcasts subscription renewal warning (triggered by cron job). */
  sendSubscriptionRenewalAlert(params: {
    tenantId: string;
    companyName: string;
    plan: string;
    daysRemaining: number;
    expiryDate: Date;
  }) {
    const { tenantId, companyName, plan, daysRemaining, expiryDate } = params;
    const urgency = daysRemaining <= 1 ? "URGENT: " : "";
    this.logger.warn(
      `[Billing] Renewal alert → tenant ${tenantId} (${daysRemaining}d remaining)`,
    );
    this.notificationsGateway.emitVarianceAlert({
      title: `${urgency}⏰ Subscription Expiring ${daysRemaining === 1 ? "Tomorrow" : `in ${daysRemaining} Days`}`,
      message: `${companyName}'s ${plan} subscription expires on ${expiryDate.toDateString()}. Renewal reminder sent.`,
      type: daysRemaining <= 1 ? "renewal_urgent" : "renewal_warning",
      metadata: { tenantId, companyName, plan, daysRemaining, expiryDate },
    });
  }
}
