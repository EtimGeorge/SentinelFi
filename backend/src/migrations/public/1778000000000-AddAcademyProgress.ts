import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Academy curriculum progress ledger (public schema).
 *
 * One row per learner identity. A none-or-one strategy keeps the table
 * immune to duplicate-ledger drift:
 *   • `userId`    unique per authenticated user
 *   • `visitorId` unique per anonymous visitor
 * Partial unique indexes mean a row carries exactly one identity key — a
 * signed-in user who also has a visitor cookie simply continues with their
 * user row (the client switches identity key when it detects auth).
 */
export class AddAcademyProgress1778000000000 implements MigrationInterface {
  name = "AddAcademyProgress1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public"."academy_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "visitorId" character varying(128),
        "ledger" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_academy_progress" PRIMARY KEY ("id")
      )
    `);
    // A visitor must never accumulate multiple ledgers under the same identity.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_academy_progress_user_id"
        ON "public"."academy_progress" ("userId") WHERE "userId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_academy_progress_visitor_id"
        ON "public"."academy_progress" ("visitorId") WHERE "visitorId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_academy_progress_updated_at"
        ON "public"."academy_progress" ("updatedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_academy_progress_updated_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_academy_progress_visitor_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_academy_progress_user_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "public"."academy_progress"`,
    );
  }
}