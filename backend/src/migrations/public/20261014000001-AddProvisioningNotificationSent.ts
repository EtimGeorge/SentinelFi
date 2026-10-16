import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Hard idempotency for provisioning-failure notifications.
 *
 * Adds `subscriptions.provisioning_notification_sent` (boolean, default false).
 * Once a first-failure or terminal provisioning email has been sent for a
 * subscription, this flag is set to true. Admin force-replays that reset
 * `provisioning_attempts` back to 1 will NOT re-trigger the first-failure
 * email, preventing email storms while still allowing terminal alerts on
 * genuinely new terminal failures.
 */
export class AddProvisioningNotificationSent20261014000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "public"."subscriptions"
        ADD COLUMN IF NOT EXISTS "provisioning_notification_sent" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_provisioning_notification_sent"
        ON "public"."subscriptions" ("provisioning_notification_sent")
        WHERE "provisioning_notification_sent" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_subscriptions_provisioning_notification_sent";
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."subscriptions"
        DROP COLUMN IF EXISTS "provisioning_notification_sent";
    `);
  }
}
