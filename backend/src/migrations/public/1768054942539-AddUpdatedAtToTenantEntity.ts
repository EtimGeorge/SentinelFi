import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedAtToTenantEntity1768054942539 implements MigrationInterface {
  name = "AddUpdatedAtToTenantEntity1768054942539";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "updated_at"`);
  }
}
