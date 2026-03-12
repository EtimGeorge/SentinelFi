import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReportingAndMessagingTables1773164796059 implements MigrationInterface {
    name = 'AddReportingAndMessagingTables1773164796059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Core Messaging Table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "receiver_id" uuid, "content" text NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0a80d1aa3c9395260e27c1245c" ON "message" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c0ab99d9dfc61172871277b52f" ON "message" ("sender_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f4da40532b0102d51beb220f16" ON "message" ("receiver_id") `);

        // Document Control System (DCS)
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_control_report_type_enum') THEN
                    CREATE TYPE "document_control_report_type_enum" AS ENUM('CAPEX_SUMMARY', 'OPEX_EFFICIENCY', 'VARIANCE_ANALYSIS', 'PAYROLL_SUMMARY', 'PROCUREMENT_FUNNEL', 'ANOMALY_DETECTION');
                END IF;
            END $$;
        `);
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "document_control" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "report_type" "document_control_report_type_enum" NOT NULL, "file_name" character varying(255) NOT NULL, "file_path" character varying(500) NOT NULL, "mime_type" character varying(100) NOT NULL, "metadata" jsonb, "created_by_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_accessed_at" TIMESTAMP WITH TIME ZONE, "is_pushed_to_external_dcs" boolean NOT NULL DEFAULT false, "pushed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_d5fc0d907f3b59f1a181c1e2806" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a3919965f72b26021d639422e6" ON "document_control" ("tenant_id") `);

        // Automated Reporting Schedules
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_schedule_report_type_enum') THEN
                    CREATE TYPE "report_schedule_report_type_enum" AS ENUM('CAPEX_SUMMARY', 'OPEX_EFFICIENCY', 'VARIANCE_ANALYSIS', 'PAYROLL_SUMMARY', 'PROCUREMENT_FUNNEL', 'ANOMALY_DETECTION');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_schedule_frequency_enum') THEN
                    CREATE TYPE "report_schedule_frequency_enum" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY');
                END IF;
            END $$;
        `);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "report_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "report_type" "report_schedule_report_type_enum" NOT NULL, "frequency" "report_schedule_frequency_enum" NOT NULL, "recipients" text array NOT NULL, "filters" jsonb, "is_active" boolean NOT NULL DEFAULT true, "last_run_at" TIMESTAMP WITH TIME ZONE, "next_run_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c7488f713986a70052eb10f1178" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_93b03e05a660a62469fa0112aa" ON "report_schedule" ("tenant_id") `);

        // Column updates
        await queryRunner.query(`ALTER TABLE "project" ALTER COLUMN "vat_rate" SET DEFAULT '7.5'`);

        // Constraints
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_c0ab99d9dfc61172871277b52f6"`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_c0ab99d9dfc61172871277b52f6" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_f4da40532b0102d51beb220f16a"`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_f4da40532b0102d51beb220f16a" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`ALTER TABLE "document_control" DROP CONSTRAINT IF EXISTS "FK_68877a2cb9c5db7e7dc3b79b230"`);
        await queryRunner.query(`ALTER TABLE "document_control" ADD CONSTRAINT "FK_68877a2cb9c5db7e7dc3b79b230" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Production-grade down logic using safe drops
        await queryRunner.query(`ALTER TABLE "document_control" DROP CONSTRAINT IF EXISTS "FK_68877a2cb9c5db7e7dc3b79b230"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_f4da40532b0102d51beb220f16a"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_c0ab99d9dfc61172871277b52f6"`);
        
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_93b03e05a660a62469fa0112aa"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "report_schedule"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a3919965f72b26021d639422e6"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "document_control"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_f4da40532b0102d51beb220f16"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_c0ab99d9dfc61172871277b52f"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_0a80d1aa3c9395260e27c1245c"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "message"`);

        // Types are generally kept in production unless explicitly requested to purge
    }

}
