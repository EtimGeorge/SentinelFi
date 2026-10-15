import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Fulfillment state of a gateway webhook event — the ledger now drives an
 * at-least-once claim state machine instead of one-shot dedupe:
 *
 *   PROCESSING → FULFILLED (success) | FAILED (error; re-claimable until cap)
 *
 * See AddWebhookFulfillmentState20261014000000 for the defect this fixes.
 */
export enum WebhookFulfillmentStatus {
  PROCESSING = "PROCESSING",
  FULFILLED = "FULFILLED",
  FAILED = "FAILED",
}

@Entity({ name: "processed_webhooks", schema: "public" })
export class ProcessedWebhookEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  gateway_event_id!: string; // The unique ID from Paystack, PayPal, etc.

  @Column()
  provider!: string; // 'paystack', 'paypal', 'ivorypay'

  @CreateDateColumn()
  processed_at!: Date;

  @Column({ type: "jsonb", nullable: true })
  payload!: any;

  // --- Claim state machine (AddWebhookFulfillmentState20261014000000) ---
  /** PROCESSING while fulfillment runs; settles to FULFILLED | FAILED. */
  @Column({ type: "varchar", length: 20, default: WebhookFulfillmentStatus.FULFILLED })
  status!: WebhookFulfillmentStatus;

  /** Fulfillment claims so far (initial claim + each re-claim). Capped. */
  @Column({ type: "integer", default: 1 })
  attempts!: number;

  /** When the current claim started; staleness here enables takeover. */
  @Column({ type: "timestamptz", nullable: true })
  claimed_at!: Date | null;

  /** When fulfillment completed (status = FULFILLED). */
  @Column({ type: "timestamptz", nullable: true })
  fulfilled_at!: Date | null;

  /** Last fulfillment failure (truncated) — diagnosis for admins + on-call. */
  @Column({ type: "text", nullable: true })
  last_error!: string | null;

  /** Subscription this event fulfills (observability; no FK — ledger stays writable). */
  @Column({ type: "varchar", length: 64, nullable: true })
  subscription_id!: string | null;

  /** Tenant provisioned by this event, when fulfillment got that far. */
  @Column({ type: "varchar", length: 255, nullable: true })
  tenant_id!: string | null;
}
