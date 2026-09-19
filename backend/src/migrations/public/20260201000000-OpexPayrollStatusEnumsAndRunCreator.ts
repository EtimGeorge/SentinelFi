import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 2 — Security & Data Integrity, public schema:
 *  - Adds 'REVERSED' to operational_expense_status_enum (opex lifecycle).
 *  - Converts payroll_entry.status from varchar(50) DEFAULT 'PAID' to a typed
 *    payroll_entry_status_enum (PENDING | PAID | FAILED | REVERSED).
 *  - Adds payroll_run.created_by_user_id (SoD approval provenance).
 */
export class OpexPayrollStatusEnumsAndRunCreator20260201000000
  implements MigrationInterface
{
  name = "OpexPayrollStatusEnumsAndRunCreator20260201000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. REVERSED on operational_expense_status_enum ----
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'operational_expense_status_enum'
            AND t.typnamespace = 'public'::regnamespace
            AND e.enumlabel = 'REVERSED'
        ) THEN
          ALTER TYPE "public"."operational_expense_status_enum"
            ADD VALUE 'REVERSED';
        END IF;
      END $$;
    `);

    // ---- 2. payroll_entry.status varchar(50) -> typed enum ----
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'payroll_entry_status_enum'
            AND typnamespace = 'public'::regnamespace
        ) THEN
          CREATE TYPE "public"."payroll_entry_status_enum" AS ENUM(
            'PENDING', 'PAID', 'FAILED', 'REVERSED'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry"
        ALTER COLUMN "status" TYPE "public"."payroll_entry_status_enum"
        USING "status"::text::"public"."payroll_entry_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry"
        ALTER COLUMN "status" SET DEFAULT 'PAID'
    `);

    // ---- 3. payroll_run.created_by_user_id (SoD provenance) ----
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_run"
        ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payroll_run_created_by"
        ON "public"."payroll_run" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // created_by_user_id
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_payroll_run_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."payroll_run" DROP COLUMN IF EXISTS "created_by_user_id"`,
    );

    // payroll_entry.status back to varchar(50)
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry"
        ALTER COLUMN "status" TYPE character varying(50)
        USING "status"::text
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."payroll_entry"
        ALTER COLUMN "status" SET DEFAULT 'PAID'
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."payroll_entry_status_enum"
    `);

    // NOTE: PostgreSQL cannot remove a single enum label — 'REVERSED' remains
    // a valid label on operational_expense_status_enum after this rollback.
  }
}