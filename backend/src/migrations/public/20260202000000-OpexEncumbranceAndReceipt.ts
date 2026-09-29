import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 4 — Encumbrance & Control, public schema:
 *  - Creates opex_encumbrance lifecycle table + status/source enums (4.1).
 *  - Creates p2p_receipt table (4.8, 3-way match).
 *  - Adds encumbrance + variance_classification columns to
 *    operational_expense (4.1 / 4.5).
 *  - Adds variance_tolerance_pct + variance_min_amount to
 *    operational_budget_category (4.4 / dual AND-threshold 4.3).
 */
export class OpexEncumbranceAndReceipt20260202000000
  implements MigrationInterface
{
  name = "OpexEncumbranceAndReceipt20260202000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Enum types ----
    await this.ensureType(
      queryRunner,
      "opex_encumbrance_status_enum",
      "'RESERVED','FIRM','LIQUIDATED','RELEASED'",
    );
    await this.ensureType(
      queryRunner,
      "opex_encumbrance_source_type_enum",
      "'EXPENSE','REQUISITION','PURCHASE_ORDER'",
    );
    await this.ensureType(
      queryRunner,
      "opex_variance_classification_enum",
      "'TIMING_VARIANCE','PERMANENT_VARIANCE'",
    );

    // ---- 2. opex_encumbrance table ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public"."opex_encumbrance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "tenant_id" uuid NOT NULL,
        "source_type" "public"."opex_encumbrance_source_type_enum" NOT NULL,
        "source_id" uuid NOT NULL,
        "status" "public"."opex_encumbrance_status_enum" NOT NULL DEFAULT 'RESERVED',
        "amount" numeric(19,4) NOT NULL DEFAULT 0,
        "operational_budget_id" uuid,
        "operational_budget_category_id" uuid,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_opex_encumbrance_source"
        ON "public"."opex_encumbrance" ("tenant_id", "source_type", "source_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_opex_encumbrance_budget"
        ON "public"."opex_encumbrance" ("tenant_id", "operational_budget_id")
    `);

    // ---- 3. p2p_receipt table (3-way match ledger) ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "public"."p2p_receipt" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "tenant_id" uuid NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "received_by_user_id" uuid NOT NULL,
        "received_date" date NOT NULL,
        "quantity" numeric(19,4) NOT NULL DEFAULT 1,
        "unit_amount" numeric(19,4) NOT NULL,
        "amount" numeric(19,4) NOT NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_p2p_receipt_po"
        ON "public"."p2p_receipt" ("tenant_id", "purchase_order_id")
    `);

    // ---- 4. operational_expense encumbrance columns ----
    await queryRunner.query(`
      ALTER TABLE "public"."operational_expense"
        ADD COLUMN IF NOT EXISTS "encumbrance_status" "public"."opex_encumbrance_status_enum"
        NOT NULL DEFAULT 'RELEASED'
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_expense"
        ADD COLUMN IF NOT EXISTS "encumbered_amount" numeric(19,4) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_expense"
        ADD COLUMN IF NOT EXISTS "variance_classification" "public"."opex_variance_classification_enum"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_operational_expense_encumbrance"
        ON "public"."operational_expense" ("tenant_id", "encumbrance_status")
    `);

    // ---- 5. operational_budget_category variance tolerance columns ----
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget_category"
        ADD COLUMN IF NOT EXISTS "variance_tolerance_pct" numeric(5,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget_category"
        ADD COLUMN IF NOT EXISTS "variance_min_amount" numeric(19,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_operational_expense_encumbrance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."operational_budget_category" DROP COLUMN IF EXISTS "variance_min_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."operational_budget_category" DROP COLUMN IF EXISTS "variance_tolerance_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."operational_expense" DROP COLUMN IF EXISTS "variance_classification"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."operational_expense" DROP COLUMN IF EXISTS "encumbered_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."operational_expense" DROP COLUMN IF EXISTS "encumbrance_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_p2p_receipt_po"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."p2p_receipt"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_opex_encumbrance_source"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_opex_encumbrance_budget"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."opex_encumbrance"`);
  }

  private async ensureType(
    queryRunner: QueryRunner,
    typeName: string,
    values: string,
  ): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = '${typeName}'
            AND typnamespace = 'public'::regnamespace
        ) THEN
          CREATE TYPE "public"."${typeName}" AS ENUM (${values});
        END IF;
      END $$;
    `);
  }
}