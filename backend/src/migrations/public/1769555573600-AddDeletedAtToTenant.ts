import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeletedAtToTenant1769555573600 implements MigrationInterface {
  name = "AddDeletedAtToTenant1769555573600";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Surgical addition of deleted_at to avoid side-effects on existing user data
    const hasColumn = await queryRunner.hasColumn("tenants", "deleted_at");
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "tenants" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "deleted_at"`);
  }
}
