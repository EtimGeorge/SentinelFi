import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddWbsLpoCommitments1773024546528 implements MigrationInterface {
  name = "AddWbsLpoCommitments1773024546528";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration executed within the context of a dynamically set search_path
    // so we DO NOT hardcode the schema name.
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD IF NOT EXISTS "total_committed_lpo" numeric(19,4) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP COLUMN IF EXISTS "total_committed_lpo"`,
    );
  }
}
