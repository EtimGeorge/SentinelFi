import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToOpexEntities1774046551047 implements MigrationInterface {
  name = "AddSoftDeleteToOpexEntities1774046551047";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" DROP CONSTRAINT "FK_f4da40532b0102d51beb220f16a"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_TENANT_PROJECT"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_TENANT_WBS_DATE"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_TENANT_PROJ_DATE"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_TENANT_EXPENSE_DATE"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_TENANT_OPEX_CATEGORY"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_f4da40532b0102d51beb220f16"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" RENAME COLUMN "receiver_id" TO "conversation_id"`,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."conversation_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" TIMESTAMP WITH TIME ZONE, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed07d3bc360f4e68836841b8358" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b31b403f2e9c21a4a48460b8ed" ON "solution_energy"."conversation_member" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1ebe869c785ab3616b58b55d2e" ON "solution_energy"."conversation_member" ("conversation_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'DIRECT', "name" character varying(255), "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77726325cecc7bc5d2442a7466" ON "solution_energy"."conversation" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "solution_energy"."billing_invoices_status_enum" AS ENUM('paid', 'pending', 'overdue')`,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."billing_invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "subscription_id" uuid NOT NULL, "invoice_number" character varying(50) NOT NULL, "amount_usd" numeric(12,2) NOT NULL, "status" "solution_energy"."billing_invoices_status_enum" NOT NULL DEFAULT 'pending', "pdf_url" character varying(255), "due_date" TIMESTAMP WITH TIME ZONE NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_536125305a544fe830cb6001869" UNIQUE ("invoice_number"), CONSTRAINT "PK_9dbe3b4ca302c61707224bf3835" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token_hash" character varying NOT NULL, "user_id" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_consumed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_91185d86d5d7557b19abbb2868b" UNIQUE ("token_hash"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_91185d86d5d7557b19abbb2868" ON "solution_energy"."password_reset_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TYPE "solution_energy"."invitations_role_enum" AS ENUM('SuperAdmin', 'CEO', 'CFO', 'Admin Director', 'Operational Director', 'Technical Director', 'Finance Manager', 'Admin Manager', 'Project Manager', 'Finance Officer', 'Admin Officer', 'Assigned Project User')`,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "email" character varying NOT NULL, "first_name" character varying, "last_name" character varying, "role" "solution_energy"."invitations_role_enum" NOT NULL DEFAULT 'Assigned Project User', "tenant_id" uuid, "is_consumed" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e577dcf9bb6d084373ed3998509" UNIQUE ("token"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "solution_energy"."ai_report_schedule_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "solution_energy"."ai_report_schedule_status_enum" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "solution_energy"."ai_report_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_by_id" uuid NOT NULL, "report_type" character varying(50) NOT NULL, "frequency" "solution_energy"."ai_report_schedule_frequency_enum" NOT NULL DEFAULT 'WEEKLY', "status" "solution_energy"."ai_report_schedule_status_enum" NOT NULL DEFAULT 'ACTIVE', "recipients" text, "project_id" uuid, "deliver_by_email" boolean NOT NULL DEFAULT false, "last_ai_narrative_preview" character varying(100), "next_run_at" TIMESTAMP WITH TIME ZONE, "last_run_at" TIMESTAMP WITH TIME ZONE, "run_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fd418098206195f5bb0ba46fac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_audit_logs_interaction_type_enum" AS ENUM('chat', 'analysis', 'forecast', 'report', 'form_fill')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" uuid, "interaction_type" "public"."ai_audit_logs_interaction_type_enum" NOT NULL, "user_message_sanitized" text NOT NULL, "ai_response_sanitized" text, "was_blocked" boolean NOT NULL DEFAULT false, "block_reason" character varying, "circuit_tripped" boolean NOT NULL DEFAULT false, "latency_ms" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1177e44bdc57719b14965dc8de0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_790599b51d31f2c67fbc930509" ON "ai_audit_logs" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ae9a9fa291a034e264dfbf53a" ON "ai_audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."wbs_budget" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."live_expense" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_budget_category" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_budget" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."payroll_entry" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" DROP COLUMN "variance_flag"`,
    );
    await queryRunner.query(
      `CREATE TYPE "solution_energy"."operational_expense_variance_flag_enum" AS ENUM('NO_VARIANCE', 'MINOR_VARIANCE', 'MAJOR_VARIANCE', 'CRITICAL_VARIANCE', 'UNAPPROVED_BUDGET_USAGE', 'OVERRIDE_APPLIED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" ADD "variance_flag" "solution_energy"."operational_expense_variance_flag_enum" NOT NULL DEFAULT 'NO_VARIANCE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" ALTER COLUMN "conversation_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_requisition" ALTER COLUMN "exchange_rate" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_invoice" ALTER COLUMN "exchange_rate" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_purchase_order" ALTER COLUMN "exchange_rate" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87aa7db0f2b0dc332736cc5b13" ON "solution_energy"."wbs_budget" ("tenant_id", "project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c88fb0833d2c080d284372870" ON "solution_energy"."live_expense" ("tenant_id", "project_id", "expense_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_591af79799d2038db380c5e4b0" ON "solution_energy"."live_expense" ("tenant_id", "wbs_id", "expense_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2db521af5d76076cc904855f56" ON "solution_energy"."operational_expense" ("tenant_id", "operational_budget_category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9ae6a6d76be7b2564979494c2c" ON "solution_energy"."operational_expense" ("tenant_id", "expense_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7fe3e887d78498d9c9813375ce" ON "solution_energy"."message" ("conversation_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."conversation_member" ADD CONSTRAINT "FK_60a5cedcd205ed3686ad16d6311" FOREIGN KEY ("conversation_id") REFERENCES "solution_energy"."conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."conversation_member" ADD CONSTRAINT "FK_b31b403f2e9c21a4a48460b8ed9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" ADD CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2" FOREIGN KEY ("conversation_id") REFERENCES "solution_energy"."conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."billing_invoices" ADD CONSTRAINT "FK_3295b3e6086c586c3f68f66e01a" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."invitations" ADD CONSTRAINT "FK_290e75d606ba89eb421b8b5ec49" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."ai_report_schedule" ADD CONSTRAINT "FK_a1957a10d18ba3883f8f9035c3a" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."ai_report_schedule" DROP CONSTRAINT "FK_a1957a10d18ba3883f8f9035c3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."invitations" DROP CONSTRAINT "FK_290e75d606ba89eb421b8b5ec49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."billing_invoices" DROP CONSTRAINT "FK_3295b3e6086c586c3f68f66e01a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" DROP CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."conversation_member" DROP CONSTRAINT "FK_b31b403f2e9c21a4a48460b8ed9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."conversation_member" DROP CONSTRAINT "FK_60a5cedcd205ed3686ad16d6311"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_7fe3e887d78498d9c9813375ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_9ae6a6d76be7b2564979494c2c"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_2db521af5d76076cc904855f56"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_591af79799d2038db380c5e4b0"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_6c88fb0833d2c080d284372870"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_87aa7db0f2b0dc332736cc5b13"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_purchase_order" ALTER COLUMN "exchange_rate" SET DEFAULT 1.000000`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_invoice" ALTER COLUMN "exchange_rate" SET DEFAULT 1.000000`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."p2p_requisition" ALTER COLUMN "exchange_rate" SET DEFAULT 1.000000`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" ALTER COLUMN "conversation_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" DROP COLUMN "variance_flag"`,
    );
    await queryRunner.query(
      `DROP TYPE "solution_energy"."operational_expense_variance_flag_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" ADD "variance_flag" character varying(255) NOT NULL DEFAULT 'NO_VARIANCE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."project" ALTER COLUMN "vat_rate" SET DEFAULT 7.5`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."payroll_entry" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_budget" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_budget_category" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."operational_expense" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."live_expense" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."wbs_budget" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ae9a9fa291a034e264dfbf53a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_790599b51d31f2c67fbc930509"`,
    );
    await queryRunner.query(`DROP TABLE "ai_audit_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."ai_audit_logs_interaction_type_enum"`,
    );
    await queryRunner.query(
      `DROP TABLE "solution_energy"."ai_report_schedule"`,
    );
    await queryRunner.query(
      `DROP TYPE "solution_energy"."ai_report_schedule_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "solution_energy"."ai_report_schedule_frequency_enum"`,
    );
    await queryRunner.query(`DROP TABLE "solution_energy"."invitations"`);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."invitations_role_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_91185d86d5d7557b19abbb2868"`,
    );
    await queryRunner.query(
      `DROP TABLE "solution_energy"."password_reset_tokens"`,
    );
    await queryRunner.query(`DROP TABLE "solution_energy"."billing_invoices"`);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."billing_invoices_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_77726325cecc7bc5d2442a7466"`,
    );
    await queryRunner.query(`DROP TABLE "solution_energy"."conversation"`);
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_1ebe869c785ab3616b58b55d2e"`,
    );
    await queryRunner.query(
      `DROP INDEX "solution_energy"."IDX_b31b403f2e9c21a4a48460b8ed"`,
    );
    await queryRunner.query(
      `DROP TABLE "solution_energy"."conversation_member"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" RENAME COLUMN "conversation_id" TO "receiver_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4da40532b0102d51beb220f16" ON "solution_energy"."message" ("receiver_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TENANT_OPEX_CATEGORY" ON "solution_energy"."operational_expense" ("operational_budget_category_id", "tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TENANT_EXPENSE_DATE" ON "solution_energy"."operational_expense" ("expense_date", "tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TENANT_PROJ_DATE" ON "solution_energy"."live_expense" ("expense_date", "project_id", "tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TENANT_WBS_DATE" ON "solution_energy"."live_expense" ("expense_date", "tenant_id", "wbs_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_TENANT_PROJECT" ON "solution_energy"."wbs_budget" ("project_id", "tenant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "solution_energy"."message" ADD CONSTRAINT "FK_f4da40532b0102d51beb220f16a" FOREIGN KEY ("receiver_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
