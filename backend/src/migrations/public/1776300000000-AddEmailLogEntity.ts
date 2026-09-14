import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Phase 2: email audit trail.
 * - Creates public.email_log table for every outbound email (sent/failed/preview).
 */
export class AddEmailLogEntity1776300000000 implements MigrationInterface {
  name = "AddEmailLogEntity1776300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("email_log");
    if (!hasTable) {
      await queryRunner.query(`CREATE TABLE "public"."email_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "to" character varying(255) NOT NULL,
        "subject" character varying(255) NOT NULL,
        "template" character varying(80),
        "provider" character varying(40) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'sent',
        "error_message" text,
        "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_log_id" PRIMARY KEY ("id")
      )`);
      await queryRunner.query(
        `CREATE INDEX "IDX_email_log_tenant_id" ON "public"."email_log" ("tenant_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_email_log_template" ON "public"."email_log" ("template")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_email_log_status" ON "public"."email_log" ("status")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_email_log_sent_at" ON "public"."email_log" ("sent_at")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("email_log")) {
      await queryRunner.query(`DROP TABLE "public"."email_log"`);
    }
  }
}