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

  sendVarianceAlert(title: string, message: string, type: string = 'warning') {
    this.logger.log(`Variance alert triggered: ${title} - ${message}`);
    this.notificationsGateway.emitVarianceAlert({ title, message, type });
  }

  /**
   * Broadcast in real-time when a senior authorizer APPROVES a budget overrun.
   * All connected finance/management clients will receive this alert immediately.
   */
  sendOverrideApprovedAlert(params: {
    authorizer: string;       // Role name of who approved it
    wbsCode: string;
    projectName: string;
    amount: number;
    varianceFlag: string;     // CRITICAL_VARIANCE | MAJOR_VARIANCE
    overrideReason: string;
    expenseId?: string;
  }) {
    const { authorizer, wbsCode, projectName, amount, varianceFlag, overrideReason } = params;
    const title = `Budget Override Approved — ${varianceFlag.replace(/_/g, ' ')}`;
    const message = `${authorizer} authorized a ${varianceFlag === 'CRITICAL_VARIANCE' ? 'CRITICAL' : 'MAJOR'} overrun on WBS ${wbsCode} (${projectName}). Amount: ${amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}. Reason: "${overrideReason}".`;
    const type = varianceFlag === 'CRITICAL_VARIANCE' ? 'critical_override' : 'major_override';

    this.logger.warn(`[Override Approved] ${title}: ${message}`);
    this.notificationsGateway.emitVarianceAlert({
      title,
      message,
      type,
      metadata: params,
    });
  }
}
