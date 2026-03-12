import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds advanced financial proposal fields (uom and custom_metadata) to wbs_budget.
 * This migration runs on the TENANT schemas.
 */
export class TenantAddAdvancedFinancialFieldsToWbs1771955000000 implements MigrationInterface {
    name = 'TenantAddAdvancedFinancialFieldsToWbs1771955000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wbs_budget"
            ADD COLUMN IF NOT EXISTS "uom" character varying(50),
            ADD COLUMN IF NOT EXISTS "custom_metadata" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP COLUMN IF EXISTS "custom_metadata"`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP COLUMN IF EXISTS "uom"`);
    }
}
