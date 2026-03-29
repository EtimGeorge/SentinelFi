import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds advanced financial proposal fields (uom and custom_metadata) to wbs_budget.
 * This migration runs on the PUBLIC schema (legacy/system configuration).
 */
export class AddAdvancedFinancialFieldsToWbs1771950000000 implements MigrationInterface {
  name = "AddAdvancedFinancialFieldsToWbs1771950000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists before altering, as some tenant strategies
    // don't keep tenant tables in the public schema.
    const tableExists = await queryRunner.hasTable("wbs_budget");
    if (tableExists) {
      await queryRunner.query(`
                ALTER TABLE "wbs_budget"
                ADD COLUMN IF NOT EXISTS "uom" character varying(50),
                ADD COLUMN IF NOT EXISTS "custom_metadata" jsonb
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable("wbs_budget");
    if (tableExists) {
      await queryRunner.query(
        `ALTER TABLE "wbs_budget" DROP COLUMN IF EXISTS "custom_metadata"`,
      );
      await queryRunner.query(
        `ALTER TABLE "wbs_budget" DROP COLUMN IF EXISTS "uom"`,
      );
    }
  }
}
