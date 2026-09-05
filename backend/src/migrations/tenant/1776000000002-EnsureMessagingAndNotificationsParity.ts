import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ensures messaging tables (conversation, conversation_member, message column parity)
 * and notifications table exist in every tenant schema.
 * Previous tenants like saencrystal_global_services missed conversation tables
 * and all tenants miss notifications table causing GET /notifications 500
 * "relation notifications does not exist".
 * Generic via ADD TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS using search_path
 * set by TenantMigrationService – no hardcoded tenant names.
 */
export class EnsureMessagingAndNotificationsParity1776000000002
  implements MigrationInterface
{
  name = "EnsureMessagingAndNotificationsParity1776000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid extension available (idempotent – in public, but ensure per schema)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // --- notifications table (tenant-scoped) ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "type" character varying(50) NOT NULL DEFAULT 'info',
        "is_read" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_tenant" ON "notifications" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "notifications" ("is_read")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_created" ON "notifications" ("created_at")`);

    // --- messaging conversation parity (from MessagingGroupEntities but generic IF NOT EXISTS) ---
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "type" character varying(20) NOT NULL DEFAULT 'DIRECT',
        "name" character varying(255),
        "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversation_tenant" ON "conversation" ("tenant_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversation_member" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "last_read_at" TIMESTAMP WITH TIME ZONE,
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_member" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_conversation_member_user" ON "conversation_member" ("user_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_conversation_member_unique" ON "conversation_member" ("conversation_id", "user_id")`);

    // --- message table parity (ensure it exists and has conversation_id not receiver_id) ---
    // Create message if not exists with new schema
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "content" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )
    `);
    // If message exists with old receiver_id column, rename to conversation_id (idempotent DO block)
    await queryRunner.query(`
      DO $$ 
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'receiver_id') THEN
              ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_f4da40532b0102d51beb220f16a";
              DROP INDEX IF EXISTS "IDX_f4da40532b0102d51beb220f16";
              ALTER TABLE "message" RENAME COLUMN "receiver_id" TO "conversation_id";
          END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_message_conversation" ON "message" ("conversation_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_message_tenant" ON "message" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_message_sender" ON "message" ("sender_id")`);

    // Ensure NOT NULL on conversation_id where needed
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message' AND column_name='conversation_id' AND is_nullable='YES') THEN
          -- attempt to set not null; if existing nulls, they remain but constraint added won't fail due to IF NOT NULL handling via try
          BEGIN
            ALTER TABLE "message" ALTER COLUMN "conversation_id" SET NOT NULL;
          EXCEPTION WHEN others THEN NULL;
          END;
        END IF;
      END $$;
    `);

    // FK constraints (idempotent drop+add)
    await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_conversation_member_conversation"`);
    await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_conversation_member_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT IF EXISTS "FK_conversation_member_user"`);
    // user is in public schema
    await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_conversation_member_user" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_conversation"`);
    await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_sender"`);
    await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_message_sender" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive only – do not drop
  }
}
