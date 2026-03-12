import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSortOrderToWbsBudget1771900500000 implements MigrationInterface {
    name = 'AddSortOrderToWbsBudget1771900500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_budget" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP COLUMN "sort_order"`);
    }
}
