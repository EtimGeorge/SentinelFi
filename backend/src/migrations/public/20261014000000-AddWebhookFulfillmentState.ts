import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * At-least-once fulfillment state for the gateway webhook ledger, plus
 * provisioning bookkeeping on subscriptions.
 *
 * Root defect this fixes: the previous contract wrote a `processed_webhooks`
 * row BEFORE running paid fulfillment (subscription activation + tenant
 * provisioning). If fulfillment threw — e.g. tenant provisioning failed —
 * the row still existed, so every gateway retry was deduped as a "duplicate"
 * and silently dropped. A captured payment whose provisioning failed could
 * never be replayed: at-most-once fulfillment with zero observability.
 *
 * The ledger now drives a claim state machine:
 *
 *   PROCESSING ──fulfillment ok──▶ FULFILLED   (terminal)
 *       │
 *       └──fulfillment err──▶ FAILED (attempts, last_error)
 *                              │  ▲
 *        gateway retry / cron ─┘  └─ re-claim while attempts < cap
 *
 * Existing rows are backfilled as FULFILLED: under the old contract they were
 * "processed", and replaying them wholesale would re-run fulfillment for
 * events that most likely already succeeded. Pre-migration failures are
 * recovered via the subscriptions.provisioning_* columns (below) and the
 * superadmin provisioning-exceptions view.
 *
 * `subscriptions.provisioning_error / provisioning_attempts / provisioned_at`
 * make "paid but unprovisioned" a first-class, queryable state on the
 * subscription itself (the webhook ledger is the replay source; these columns
 * are the admin-facing diagnosis).
 */
export class AddWebhookFulfillmentState20261014000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "public"."processed_webhooks"
        ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'FULFILLED',
        ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "fulfilled_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "last_error" text,
        ADD COLUMN IF NOT EXISTS "subscription_id" character varying(64),
        ADD COLUMN IF NOT EXISTS "tenant_id" character varying(255);
    `);
    // Backfill: rows written under the old contract are considered fulfilled.
    await queryRunner.query(`
      UPDATE "public"."processed_webhooks"
      SET "fulfilled_at" = "processed_at"
      WHERE "fulfilled_at" IS NULL;
    `);
    // Reconciliation scan: FAILED or possibly-dead PROCESSING claims.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_processed_webhooks_status_claimed_at"
        ON "public"."processed_webhooks" ("status", "claimed_at");
    `);

    await queryRunner.query(`
      ALTER TABLE "public"."subscriptions"
        ADD COLUMN IF NOT EXISTS "provisioning_error" text,
        ADD COLUMN IF NOT EXISTS "provisioning_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "provisioned_at" TIMESTAMP WITH TIME ZONE;
    `);
    // Paid-but-unprovisioned escalation scan (webhook may never have arrived).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_paid_pending"
        ON "public"."subscriptions" ("created_at")
        WHERE "status" = 'pending' AND "gateway_reference" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_subscriptions_paid_pending";`,
    );
    await queryRunner.query(`
      ALTER TABLE "public"."subscriptions"
        DROP COLUMN IF EXISTS "provisioning_attempts",
        DROP COLUMN IF EXISTS "provisioned_at",
        DROP COLUMN IF EXISTS "provisioning_error";
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_processed_webhooks_status_claimed_at";`,
    );
    await queryRunner.query(`
      ALTER TABLE "public"."processed_webhooks"
        DROP COLUMN IF EXISTS "tenant_id",
        DROP COLUMN IF EXISTS "subscription_id",
        DROP COLUMN IF EXISTS "last_error",
        DROP COLUMN IF EXISTS "fulfilled_at",
        DROP COLUMN IF EXISTS "claimed_at",
        DROP COLUMN IF EXISTS "attempts",
        DROP COLUMN IF EXISTS "status";
    `);
  }
}
