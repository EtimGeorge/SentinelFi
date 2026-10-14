import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Multi-currency receipts: `p2p_receipt` gains its own currency,
 * exchange_rate and USD-normalised base_amount so received amounts can be
 * reconciled against POs and invoices in a single base currency.
 */
export class AddReceiptCurrency1777000000007 implements MigrationInterface {
  name = "AddReceiptCurrency1777000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(`
      ALTER TABLE "p2p_receipt"
        ADD COLUMN IF NOT EXISTS "currency" character varying(3) NOT NULL DEFAULT 'USD',
        ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(19,6) NOT NULL DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS "base_amount" numeric(19,4) NOT NULL DEFAULT 0
    `);

    // Backfill: legacy receipts predate multi-currency, so treat their amount
    // as already base-currency equivalent.
    await queryRunner.query(`
      UPDATE "p2p_receipt"
      SET "base_amount" = "amount"
      WHERE "base_amount" = 0 AND "amount" <> 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "p2p_receipt"
        DROP COLUMN IF EXISTS "base_amount",
        DROP COLUMN IF EXISTS "exchange_rate",
        DROP COLUMN IF EXISTS "currency"
    `);
  }
}
