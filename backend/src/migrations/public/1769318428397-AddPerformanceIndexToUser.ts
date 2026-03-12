import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexToUser1769318428397 implements MigrationInterface {
    name = 'AddPerformanceIndexToUser1769318428397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_3d79be558ff58a353061c6b1a8" ON "user" ("email", "is_active") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3d79be558ff58a353061c6b1a8"`);
    }

}
