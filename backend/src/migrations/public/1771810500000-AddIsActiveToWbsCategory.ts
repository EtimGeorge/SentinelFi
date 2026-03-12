import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToWbsCategory1771810500000 implements MigrationInterface {
    name = 'AddIsActiveToWbsCategory1771810500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_category" ADD "is_active" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wbs_category" DROP COLUMN "is_active"`);
    }
}
