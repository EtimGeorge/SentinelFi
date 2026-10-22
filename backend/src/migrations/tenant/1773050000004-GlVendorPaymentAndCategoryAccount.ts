import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * GL postings for invoices, payments and OPEX expenses.
 *
 * 1. Adds the `VENDOR_PAYMENT` journal source type. Invoice recognition
 *    (VENDOR_INVOICE) and the cash settlement of that invoice
 *    (VENDOR_PAYMENT) are distinct business documents, so they need distinct
 *    source types to satisfy the (tenant, source_type, source_id) idempotency
 *    key — both would otherwise collide on the invoice id.
 *
 * 2. Adds `budget_category.gl_account_id` so OPEX expenses map to a real
 *    expense account. The OPEX chain (expense -> operational_budget_category
 *    -> budget) carried no GL mapping at all, which made expense posting
 *    impossible without hard-coding a single "General and Sundry" account.
 *
 *    The mapping lives on the budget-category CATALOG rather than on
 *    operational_budget_category: the catalog is the shared taxonomy that
 *    users actually manage (CategoryManager -> /operational-budgets/categories),
 *    and the app already joins the two by name (see deleteCategory's usage
 *    guard). Putting it on each budget's category row would force users to
 *    repeat the mapping for every budget.
 *
 *    Nullable: unmapped categories fall back to SYSTEM_ACCOUNT_CODES.GENERAL_EXPENSE.
 *    System-default catalog rows (tenant_id NULL) are shared across tenants
 *    while gl_account is tenant-scoped, so they are never mapped and always
 *    fall back.
 *
 * Notes / trade-offs:
 *  - `ALTER TYPE ... ADD VALUE` is allowed inside a transaction block from
 *    PostgreSQL 12 onward (local dev and Neon both run 15+); the new label is
 *    only consumed by later transactions.
 *  - Dropping an enum label requires PostgreSQL 17+, so `down()` leaves
 *    `VENDOR_PAYMENT` in place — it is inert and harmless.
 */
export class GlVendorPaymentAndCategoryAccount1773050000004
  implements MigrationInterface
{
  name = "GlVendorPaymentAndCategoryAccount1773050000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `ALTER TYPE "gl_journal_entry_source_type_enum" ADD VALUE IF NOT EXISTS 'VENDOR_PAYMENT'`,
    );

    await queryRunner.query(
      `ALTER TABLE "budget_category" ADD COLUMN IF NOT EXISTS "gl_account_id" uuid`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_category_gl_account" ON "budget_category" ("tenant_id", "gl_account_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_budget_category_gl_account') THEN
          ALTER TABLE "budget_category"
            ADD CONSTRAINT "FK_budget_category_gl_account"
            FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id")
            ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_budget_category_gl_account') THEN
          ALTER TABLE "budget_category"
            DROP CONSTRAINT "FK_budget_category_gl_account";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_budget_category_gl_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_category" DROP COLUMN IF EXISTS "gl_account_id"`,
    );
    // 'VENDOR_PAYMENT' stays in the enum: dropping enum labels needs PG 17+.
  }
}
