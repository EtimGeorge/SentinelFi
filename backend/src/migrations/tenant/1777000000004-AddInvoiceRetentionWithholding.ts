import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Contractor payables controls: retention (retainage) and withholding tax on
 * vendor invoices. Both are additive, defaulting to 0 so existing rows and
 * callers are unaffected. `net_payable` is the cash actually due to the vendor
 * (`amount` - retention - WHT); retention is released later via a claim.
 */
export class AddInvoiceRetentionWithholding1777000000004 implements MigrationInterface {
  name = "AddInvoiceRetentionWithholding1777000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match InitialTenantSchemaSetup / AddTenantCompositeIndexes: scope raw DDL
    // to the tenant schema rather than the pooled session default.
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    const adds = [
      `ADD COLUMN IF NOT EXISTS "retention_pct" numeric(5,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "retention_amount" numeric(19,4) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "wht_pct" numeric(5,2) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "wht_amount" numeric(19,4) NOT NULL DEFAULT 0`,
      `ADD COLUMN IF NOT EXISTS "net_payable" numeric(19,4) NOT NULL DEFAULT 0`,
    ];
    for (const col of adds) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'p2p_invoice') THEN
            EXECUTE 'ALTER TABLE "p2p_invoice" ${col}';
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "net_payable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "wht_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "wht_pct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "retention_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "p2p_invoice" DROP COLUMN IF EXISTS "retention_pct"`,
    );
  }
}
