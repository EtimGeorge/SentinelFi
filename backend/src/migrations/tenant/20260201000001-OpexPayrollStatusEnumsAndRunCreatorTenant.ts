import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 2 — Security & Data Integrity, tenant schema.
 * Mirrors public/20260201000000 for every tenant schema:
 *  - Adds 'REVERSED' to operational_expense_status_enum.
 *  - Converts payroll_entry.status to payroll_entry_status_enum
 *    (PENDING | PAID | FAILED | REVERSED).
 *  - Adds payroll_run.created_by_user_id (SoD approval provenance).
 *
 * Follows the current tenant-migration convention: set search_path to the
 * tenant schema, use unqualified identifiers (see 20260131103709-AddCEOAnnotation).
 */
export class OpexPayrollStatusEnumsAndRunCreatorTenant20260201000001
  implements MigrationInterface
{
  name = "OpexPayrollStatusEnumsAndRunCreatorTenant20260201000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // ---- 1. REVERSED on operational_expense_status_enum ----
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'operational_expense_status_enum'
            AND t.typnamespace = current_schema()::regnamespace
            AND e.enumlabel = 'REVERSED'
        ) THEN
          ALTER TYPE "operational_expense_status_enum"
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
            AND typnamespace = current_schema()::regnamespace
        ) THEN
          CREATE TYPE "payroll_entry_status_enum" AS ENUM(
            'PENDING', 'PAID', 'FAILED', 'REVERSED'
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "payroll_entry" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "payroll_entry"
        ALTER COLUMN "status" TYPE "payroll_entry_status_enum"
        USING "status"::text::"payroll_entry_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "payroll_entry"
        ALTER COLUMN "status" SET DEFAULT 'PAID'
    `);

    // ---- 3. payroll_run.created_by_user_id (SoD provenance) ----
    await queryRunner.query(`
      ALTER TABLE "payroll_run"
        ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payroll_run_created_by"
        ON "payroll_run" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payroll_run_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "payroll_run" DROP COLUMN IF EXISTS "created_by_user_id"`,
    );

    await queryRunner.query(`
      ALTER TABLE "payroll_entry" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(
      `ALTER TABLE "payroll_entry" ALTER COLUMN "status" TYPE character varying(50) USING "status"::text`,
    );
    await queryRunner.query(`
      ALTER TABLE "payroll_entry" ALTER COLUMN "status" SET DEFAULT 'PAID'
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "payroll_entry_status_enum"`);

    // NOTE: PostgreSQL cannot remove a single enum label — 'REVERSED' remains
    // a valid label on operational_expense_status_enum after this rollback.
  }
}