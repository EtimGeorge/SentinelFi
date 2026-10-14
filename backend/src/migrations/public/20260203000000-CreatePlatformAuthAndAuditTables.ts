import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Platform-scoped auth + AI-audit tables.
 *
 * WHY THIS EXISTS
 * ---------------
 * The tenant migration `1774046551047-AddSoftDeleteToOpexEntities` used to
 * create four PLATFORM tables (`billing_invoices`, `invitations`,
 * `password_reset_tokens`, `ai_audit_logs`) *inside the tenant schema*. That
 * was wrong on two counts:
 *   1. Their entities live in the `public` schema (`BillingInvoiceEntity` and
 *      `AiAuditLogEntity` are declared `schema: "public"`; `InvitationEntity`
 *      and `PasswordResetEntity` are unqualified and therefore resolve to the
 *      default `public` DataSource). A tenant-schema copy is never read by the
 *      application — it is dead weight.
 *   2. `billing_invoices`, `invitations` and `subscriptions` already have their
 *      own public migrations, but `password_reset_tokens` and `ai_audit_logs`
 *      did NOT — so the only place they were ever created was the (mis-placed)
 *      tenant migration. Removing them from the tenant migration would have
 *      orphaned them, breaking password-reset and AI-audit for every tenant.
 *
 * This migration is the correct home: it creates `password_reset_tokens` and
 * `ai_audit_logs` once, globally, in `public`. Public migrations run a single
 * time at boot (see `public-migrations-bootstrap.service.ts`), so there is no
 * per-tenant race. `billing_invoices` / `invitations` / `subscriptions` are
 * intentionally NOT recreated here — they are owned by their own public
 * migrations (`1773900000000`, `1773705230787`).
 *
 * IDEMPOTENT: every statement is guarded, so a re-run is a no-op.
 */
export class CreatePlatformAuthAndAuditTables20260203000000
  implements MigrationInterface
{
  name = "CreatePlatformAuthAndAuditTables20260203000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── password_reset_tokens (public) ──────────────────────────────────────
    // Only the SHA-256 hash of a reset token is persisted; the plaintext is
    // emailed. See PasswordResetEntity.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying NOT NULL,
        "user_id" character varying NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "is_consumed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_91185d86d5d7557b19abbb2868b" UNIQUE ("token_hash"),
        CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_91185d86d5d7557b19abbb2868" ON "password_reset_tokens" ("token_hash")`,
    );

    // ── ai_audit_logs (public) ──────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'ai_audit_logs_interaction_type_enum'
            AND n.nspname = 'public'
        ) THEN
          CREATE TYPE "ai_audit_logs_interaction_type_enum"
            AS ENUM('chat', 'analysis', 'forecast', 'report', 'form_fill');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid,
        "interaction_type" "ai_audit_logs_interaction_type_enum" NOT NULL,
        "user_message_sanitized" text NOT NULL,
        "ai_response_sanitized" text,
        "was_blocked" boolean NOT NULL DEFAULT false,
        "block_reason" character varying,
        "circuit_tripped" boolean NOT NULL DEFAULT false,
        "latency_ms" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1177e44bdc57719b14965dc8de0" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_790599b51d31f2c67fbc930509" ON "ai_audit_logs" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0ae9a9fa291a034e264dfbf53a" ON "ai_audit_logs" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_0ae9a9fa291a034e264dfbf53a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_790599b51d31f2c67fbc930509"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_audit_logs"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ai_audit_logs_interaction_type_enum"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_91185d86d5d7557b19abbb2868"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  }
}
