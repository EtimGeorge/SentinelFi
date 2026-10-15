import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Not, IsNull, Repository } from "typeorm";
import { SubscriptionEntity, SubscriptionStatus } from "./entities/subscription.entity";
import { WebhookService } from "./webhook.service";
import { BillingService, TerminalFulfillmentError } from "./billing.service";

/**
 * Safety net that makes the paid → provisioned chain at-least-once:
 *  1. replays FAILED / dead-PROCESSING webhook claims from their stored
 *     payloads (bounded batch, shared attempt cap, CAS reclaim so a live
 *     gateway retry is never raced)
 *  2. escalates paid-but-unprovisioned subscriptions whose webhook never
 *     arrived (surfaced via the superadmin provisioning-exceptions endpoint;
 *     verifying the charge against the gateway dashboard is a manual admin
 *     step — refunds likewise stay explicit admin actions)
 * Runs on top of gateway retries, not instead of them.
 */
@Injectable()
export class ProvisioningReconciliationService {
  private readonly logger = new Logger(ProvisioningReconciliationService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    private readonly webhookService: WebhookService,
    private readonly billingService: BillingService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, {
    name: "provisioning-reconciliation",
    timeZone: "UTC",
  })
  async reconcile(): Promise<void> {
    const replay = await this.replayFailedWebhooks();
    await this.escalateUnprovisionedPaid();
    if (replay.succeeded > 0 || replay.failed > 0) {
      this.logger.log(
        `Provisioning reconciliation: ${replay.replayed} replayed, ${replay.succeeded} fulfilled, ${replay.failed} failed again.`,
      );
    }
  }

  /**
   * Replays FAILED rows under the attempt cap + dead PROCESSING claims.
   * Reclaim is a CAS on (status, attempts), so exactly one worker wins even
   * when a gateway retry races the cron.
   */
  async replayFailedWebhooks(
    take = 25,
  ): Promise<{ replayed: number; succeeded: number; failed: number }> {
    const rows = await this.webhookService.findReplayable(take);
    let succeeded = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const claimed = await this.webhookService.reclaimForReplay(row);
        if (!claimed) continue; // a gateway retry took it — not ours to replay
        try {
          const subscriptionId =
            await this.billingService.replayFulfillment(row);
          await this.webhookService.markFulfilled(
            row.id,
            subscriptionId ? { subscriptionId } : {},
          );
          succeeded++;
        } catch (err) {
          const terminal = err instanceof TerminalFulfillmentError;
          const message = err instanceof Error ? err.message : String(err);
          await this.webhookService.markFailed(row.id, message, { terminal });
          failed++;
          this.logger.error(
            `Replay of ${row.provider} event ${row.gateway_event_id} failed again (${terminal ? "terminal" : "retryable"}): ${message}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Could not replay webhook ${row.gateway_event_id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { replayed: rows.length, succeeded, failed };
  }

  /**
   * Paid subscriptions that went through a gateway checkout (>1h ago) but are
   * still PENDING: their webhook may never have arrived. The charge cannot be
   * re-verified programmatically without per-event gateway credentials here —
   * escalate loudly; the superadmin endpoint lists them with references for
   * manual verification followed by a replay.
   */
  async escalateUnprovisionedPaid(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const stuck = await this.subscriptionRepository.count({
      where: {
        status: SubscriptionStatus.PENDING,
        gateway_reference: Not(IsNull()),
        created_at: LessThan(cutoff),
      },
    });
    if (stuck > 0) {
      this.logger.error(
        `[provisioning-reconciliation] ${stuck} PAID subscription(s) pending provisioning for >1h — see GET /billing/provisioning-exceptions (superadmin) to verify + replay.`,
      );
    }
  }
}
