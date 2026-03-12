import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the missing "updated_at" column to wbs_category in the tenant schema.
 */
export class AddUpdatedAtToWbsCategory1771918000000 implements MigrationInterface {
    name = 'AddUpdatedAtToWbsCategory1771918000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "wbs_category"
            ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "updated_at"`);
    }
}
