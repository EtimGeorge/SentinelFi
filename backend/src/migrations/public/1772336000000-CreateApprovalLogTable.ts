import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateApprovalLogTable1772336000000 implements MigrationInterface {
    name = 'CreateApprovalLogTable1772336000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Enums if they don't exist
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_log_document_type_enum') THEN
                    CREATE TYPE "approval_log_document_type_enum" AS ENUM('WBS_BUDGET', 'REQUISITION', 'PAYROLL_RUN');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_log_status_enum') THEN
                    CREATE TYPE "approval_log_status_enum" AS ENUM('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "approval_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "document_type" "approval_log_document_type_enum" NOT NULL, 
                "document_id" uuid NOT NULL, 
                "status" "approval_log_status_enum" NOT NULL, 
                "actor_id" uuid NOT NULL, 
                "comments" text, 
                "amount" numeric(19,4), 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_approval_log_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approval_log_tenant_id" ON "approval_log" ("tenant_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_approval_log_document_id" ON "approval_log" ("document_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "approval_log"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "approval_log_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "approval_log_document_type_enum"`);
    }
}
