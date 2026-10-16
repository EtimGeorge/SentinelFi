import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates `public.processed_webhooks`, the idempotency ledger for inbound
 * payment-gateway webhooks.
 *
 * The `ProcessedWebhookEntity` has been registered with the app since the
 * billing integration landed, and `WebhookService` reads/writes it on every
 * callback (dedupe on `gateway_event_id`, then record the event). No migration
 * ever created the backing table, however, so on any environment running with
 * `synchronize: false` (i.e. production) the very first webhook crashed the
 * dedupe lookup with "relation processed_webhooks does not exist" — which
 * surfaced to the gateway as a 500 and triggered their retry storm.
 *
 * The table is intentionally GLOBAL (public schema, no tenant_id): a gateway
 * event id is unique across the whole platform, and dedupe must happen before
 * any tenant is resolved from the payload. The unique index on
 * `gateway_event_id` is what makes the insert-once-then-conflict pattern in
 * WebhookService safe under concurrent retries.
 */
export class CreateProcessedWebhooks20261013000000 implements MigrationInterface {
  name = "CreateProcessedWebhooks20261013000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "public"."processed_webhooks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "gateway_event_id" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "payload" jsonb,
        CONSTRAINT "PK_processed_webhooks" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_processed_webhooks_gateway_event_id"
        ON "public"."processed_webhooks" ("gateway_event_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_processed_webhooks_provider"
        ON "public"."processed_webhooks" ("provider")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_processed_webhooks_provider"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_processed_webhooks_gateway_event_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "public"."processed_webhooks"`,
    );
  }
}
