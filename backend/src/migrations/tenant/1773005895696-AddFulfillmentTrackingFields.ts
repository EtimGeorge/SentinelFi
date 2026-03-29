import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFulfillmentTrackingFields1773005895696 implements MigrationInterface {
  name = "AddFulfillmentTrackingFields1773005895696";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_approval_log_tenant_id_idx"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_approval_log_document_id_idx"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD "quantity_actual" numeric(19,4) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ADD "days_actual" numeric(19,4) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" ADD "days" numeric(19,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" ADD "approval_status" character varying(50) NOT NULL DEFAULT 'APPROVED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" ADD "override_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`,
    );
    await queryRunner.query(
      `ALTER TYPE "wbs_budget_status_enum" RENAME TO "wbs_budget_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "wbs_budget_status_enum" AS ENUM('draft', 'pending', 'approved', 'rejected', 'recalled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" TYPE "wbs_budget_status_enum" USING "status"::"text"::"wbs_budget_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "wbs_budget_status_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_log_tenant_id_new" ON "approval_log" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_log_document_id_new" ON "approval_log" ("document_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_log" ADD CONSTRAINT "FK_approval_log_actor_ref" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `ALTER TABLE "approval_log" DROP CONSTRAINT "FK_approval_log_actor_ref"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_approval_log_document_id_new"`);
    await queryRunner.query(`DROP INDEX "IDX_approval_log_tenant_id_new"`);
    await queryRunner.query(
      `CREATE TYPE "wbs_budget_status_enum_old" AS ENUM('pending', 'approved', 'rejected', 'draft')`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" TYPE "wbs_budget_status_enum_old" USING "status"::"text"::"wbs_budget_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "wbs_budget_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "wbs_budget_status_enum_old" RENAME TO "wbs_budget_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT 7.5`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" DROP COLUMN "override_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_expense" DROP COLUMN "approval_status"`,
    );
    await queryRunner.query(`ALTER TABLE "live_expense" DROP COLUMN "days"`);
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP COLUMN "days_actual"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_budget" DROP COLUMN "quantity_actual"`,
    );
  }
}
