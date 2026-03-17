import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenantOnboardingFields1773705230787 implements MigrationInterface {
    name = 'AddTenantOnboardingFields1773705230787'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_settings" DROP CONSTRAINT "FK_tenant_settings_tenant_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_user_email_is_active"`);
        await queryRunner.query(`CREATE TABLE "conversation_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversation_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_at" TIMESTAMP WITH TIME ZONE, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ed07d3bc360f4e68836841b8358" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b31b403f2e9c21a4a48460b8ed" ON "conversation_member" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1ebe869c785ab3616b58b55d2e" ON "conversation_member" ("conversation_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'DIRECT', "name" character varying(255), "last_activity_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_77726325cecc7bc5d2442a7466" ON "conversation" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "conversation_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "content" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0a80d1aa3c9395260e27c1245c" ON "message" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7fe3e887d78498d9c9813375ce" ON "message" ("conversation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c0ab99d9dfc61172871277b52f" ON "message" ("sender_id") `);
        await queryRunner.query(`CREATE TYPE "public"."document_control_report_type_enum" AS ENUM('CAPEX_SUMMARY', 'OPEX_EFFICIENCY', 'VARIANCE_ANALYSIS', 'PAYROLL_SUMMARY', 'PROCUREMENT_FUNNEL', 'ANOMALY_DETECTION')`);
        await queryRunner.query(`CREATE TABLE "document_control" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "report_type" "public"."document_control_report_type_enum" NOT NULL, "file_name" character varying(255) NOT NULL, "file_path" character varying(500) NOT NULL, "mime_type" character varying(100) NOT NULL, "metadata" jsonb, "created_by_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_accessed_at" TIMESTAMP WITH TIME ZONE, "is_pushed_to_external_dcs" boolean NOT NULL DEFAULT false, "pushed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d5fc0d907f3b59f1a181c1e2806" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a3919965f72b26021d639422e6" ON "document_control" ("tenant_id") `);
        await queryRunner.query(`CREATE TYPE "public"."report_schedule_report_type_enum" AS ENUM('CAPEX_SUMMARY', 'OPEX_EFFICIENCY', 'VARIANCE_ANALYSIS', 'PAYROLL_SUMMARY', 'PROCUREMENT_FUNNEL', 'ANOMALY_DETECTION')`);
        await queryRunner.query(`CREATE TYPE "public"."report_schedule_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY')`);
        await queryRunner.query(`CREATE TABLE "report_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "report_type" "public"."report_schedule_report_type_enum" NOT NULL, "frequency" "public"."report_schedule_frequency_enum" NOT NULL, "recipients" text array NOT NULL, "filters" jsonb, "is_active" boolean NOT NULL DEFAULT true, "last_run_at" TIMESTAMP WITH TIME ZONE, "next_run_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c7488f713986a70052eb10f1178" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_93b03e05a660a62469fa0112aa" ON "report_schedule" ("tenant_id") `);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('pending', 'trialing', 'active', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_billing_cycle_enum" AS ENUM('monthly', 'annual', 'trial')`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid, "plan" character varying(50) NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'pending', "billing_cycle" "public"."subscriptions_billing_cycle_enum" NOT NULL DEFAULT 'monthly', "amount_usd" numeric(10,2) NOT NULL DEFAULT '0', "gateway" character varying(50), "gateway_reference" character varying(255), "admin_email" character varying(255), "admin_first_name" character varying(255), "admin_last_name" character varying(255), "company_name" character varying(255), "base_currency" character varying(3) NOT NULL DEFAULT 'USD', "trial_ends_at" TIMESTAMP WITH TIME ZONE, "current_period_start" TIMESTAMP WITH TIME ZONE, "current_period_end" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invitations_role_enum" AS ENUM('SuperAdmin', 'CEO', 'CFO', 'Admin Director', 'Operational Director', 'Technical Director', 'Finance Manager', 'Admin Manager', 'Project Manager', 'Finance Officer', 'Admin Officer', 'Assigned Project User')`);
        await queryRunner.query(`CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "email" character varying NOT NULL, "first_name" character varying, "last_name" character varying, "role" "public"."invitations_role_enum" NOT NULL DEFAULT 'Assigned Project User', "tenant_id" uuid, "is_consumed" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e577dcf9bb6d084373ed3998509" UNIQUE ("token"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ai_report_schedule_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY')`);
        await queryRunner.query(`CREATE TYPE "public"."ai_report_schedule_status_enum" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "ai_report_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "created_by_id" uuid NOT NULL, "report_type" character varying(50) NOT NULL, "frequency" "public"."ai_report_schedule_frequency_enum" NOT NULL DEFAULT 'WEEKLY', "status" "public"."ai_report_schedule_status_enum" NOT NULL DEFAULT 'ACTIVE', "recipients" text, "project_id" uuid, "deliver_by_email" boolean NOT NULL DEFAULT false, "last_ai_narrative_preview" character varying(100), "next_run_at" TIMESTAMP WITH TIME ZONE, "last_run_at" TIMESTAMP WITH TIME ZONE, "run_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fd418098206195f5bb0ba46fac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "project" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" ADD "total_committed_lpo" numeric(19,4) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tenant_settings" ADD CONSTRAINT "FK_a6abc1c3ed0df635955fc852f1c" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_60a5cedcd205ed3686ad16d6311" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_member" ADD CONSTRAINT "FK_b31b403f2e9c21a4a48460b8ed9" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_c0ab99d9dfc61172871277b52f6" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_control" ADD CONSTRAINT "FK_68877a2cb9c5db7e7dc3b79b230" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_f6ac03431c311ccb8bbd7d3af18" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_290e75d606ba89eb421b8b5ec49" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_report_schedule" ADD CONSTRAINT "FK_a1957a10d18ba3883f8f9035c3a" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_report_schedule" DROP CONSTRAINT "FK_a1957a10d18ba3883f8f9035c3a"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_290e75d606ba89eb421b8b5ec49"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_f6ac03431c311ccb8bbd7d3af18"`);
        await queryRunner.query(`ALTER TABLE "document_control" DROP CONSTRAINT "FK_68877a2cb9c5db7e7dc3b79b230"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_c0ab99d9dfc61172871277b52f6"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_7fe3e887d78498d9c9813375ce2"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT "FK_b31b403f2e9c21a4a48460b8ed9"`);
        await queryRunner.query(`ALTER TABLE "conversation_member" DROP CONSTRAINT "FK_60a5cedcd205ed3686ad16d6311"`);
        await queryRunner.query(`ALTER TABLE "tenant_settings" DROP CONSTRAINT "FK_a6abc1c3ed0df635955fc852f1c"`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "updated_at" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT 7.5`);
        await queryRunner.query(`ALTER TABLE "wbs_budget" DROP COLUMN "total_committed_lpo"`);
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`DROP TABLE "ai_report_schedule"`);
        await queryRunner.query(`DROP TYPE "public"."ai_report_schedule_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ai_report_schedule_frequency_enum"`);
        await queryRunner.query(`DROP TABLE "invitations"`);
        await queryRunner.query(`DROP TYPE "public"."invitations_role_enum"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_billing_cycle_enum"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_93b03e05a660a62469fa0112aa"`);
        await queryRunner.query(`DROP TABLE "report_schedule"`);
        await queryRunner.query(`DROP TYPE "public"."report_schedule_frequency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."report_schedule_report_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3919965f72b26021d639422e6"`);
        await queryRunner.query(`DROP TABLE "document_control"`);
        await queryRunner.query(`DROP TYPE "public"."document_control_report_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0ab99d9dfc61172871277b52f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7fe3e887d78498d9c9813375ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a80d1aa3c9395260e27c1245c"`);
        await queryRunner.query(`DROP TABLE "message"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77726325cecc7bc5d2442a7466"`);
        await queryRunner.query(`DROP TABLE "conversation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ebe869c785ab3616b58b55d2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b31b403f2e9c21a4a48460b8ed"`);
        await queryRunner.query(`DROP TABLE "conversation_member"`);
        await queryRunner.query(`CREATE INDEX "IDX_user_email_is_active" ON "user" ("email", "is_active") `);
        await queryRunner.query(`ALTER TABLE "tenant_settings" ADD CONSTRAINT "FK_tenant_settings_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
