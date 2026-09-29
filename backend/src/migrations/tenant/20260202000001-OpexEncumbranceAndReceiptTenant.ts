import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 4 — Encumbrance & Control, tenant schema.
 * Mirrors public/20260202000000 for every tenant schema:
 *  - opex_encumbrance lifecycle table + status/source enums (4.1).
 *  - p2p_receipt table (4.8, 3-way match).
 *  - operational_expense encumbrance + variance_classification columns.
 *  - operational_budget_category variance tolerance columns (4.3 / 4.4).
 *
 * Follows the tenant-migration convention: set search_path to the tenant
 * schema, use unqualified identifiers.
 */
export class OpexEncumbranceAndReceiptTenant20260202000001
  implements MigrationInterface
{
  name = "OpexEncumbranceAndReceiptTenant20260202000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

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

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "opex_encumbrance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "tenant_id" uuid NOT NULL,
        "source_type" "opex_encumbrance_source_type_enum" NOT NULL,
        "source_id" uuid NOT NULL,
        "status" "opex_encumbrance_status_enum" NOT NULL DEFAULT 'RESERVED',
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
        ON "opex_encumbrance" ("tenant_id", "source_type", "source_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_opex_encumbrance_budget"
        ON "opex_encumbrance" ("tenant_id", "operational_budget_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "p2p_receipt" (
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
        ON "p2p_receipt" ("tenant_id", "purchase_order_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "operational_expense"
        ADD COLUMN IF NOT EXISTS "encumbrance_status" "opex_encumbrance_status_enum"
        NOT NULL DEFAULT 'RELEASED'
    `);
    await queryRunner.query(`
      ALTER TABLE "operational_expense"
        ADD COLUMN IF NOT EXISTS "encumbered_amount" numeric(19,4) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "operational_expense"
        ADD COLUMN IF NOT EXISTS "variance_classification" "opex_variance_classification_enum"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_operational_expense_encumbrance"
        ON "operational_expense" ("tenant_id", "encumbrance_status")
    `);

    await queryRunner.query(`
      ALTER TABLE "operational_budget_category"
        ADD COLUMN IF NOT EXISTS "variance_tolerance_pct" numeric(5,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "operational_budget_category"
        ADD COLUMN IF NOT EXISTS "variance_min_amount" numeric(19,4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_operational_expense_encumbrance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_category" DROP COLUMN IF EXISTS "variance_min_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_budget_category" DROP COLUMN IF EXISTS "variance_tolerance_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_expense" DROP COLUMN IF EXISTS "variance_classification"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_expense" DROP COLUMN IF EXISTS "encumbered_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operational_expense" DROP COLUMN IF EXISTS "encumbrance_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_receipt_po"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "p2p_receipt"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_opex_encumbrance_source"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_opex_encumbrance_budget"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "opex_encumbrance"`);
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
            AND typnamespace = current_schema()::regnamespace
        ) THEN
          CREATE TYPE "${typeName}" AS ENUM (${values});
        END IF;
      END $$;
    `);
  }
}