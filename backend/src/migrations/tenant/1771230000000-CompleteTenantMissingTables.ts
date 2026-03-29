import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteTenantMissingTables1771230000000 implements MigrationInterface {
  name = "CompleteTenantMissingTables1771230000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. ENUMS ---
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lpo_status_enum') THEN
                    CREATE TYPE "lpo_status_enum" AS ENUM('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'CANCELLED');
                END IF;
            END $$;
        `);

    // --- 2. MISSING TABLES ---

    // project_audit
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "project_audit" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "project_id" uuid NOT NULL, 
                "change_type" character varying(100) NOT NULL, 
                "old_value" numeric(19,4), 
                "new_value" numeric(19,4), 
                "description" text NOT NULL, 
                "performed_by_user_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_project_audit_id" PRIMARY KEY ("id")
            )
        `);

    // project_inflow
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "project_inflow" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "project_id" uuid NOT NULL, 
                "milestone_name" character varying(100) NOT NULL, 
                "description" text, 
                "amount_received" numeric(19,4) NOT NULL, 
                "receipt_date" date NOT NULL, 
                "bank_reference" character varying(255), 
                "received_by_user_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_project_inflow_id" PRIMARY KEY ("id")
            )
        `);

    // lpo
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "lpo" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "lpo_number" character varying(100) NOT NULL, 
                "project_id" uuid NOT NULL, 
                "wbs_id" uuid NOT NULL, 
                "vendor_name" character varying(255) NOT NULL, 
                "description" text NOT NULL, 
                "amount_committed" numeric(19,4) NOT NULL, 
                "amount_paid" numeric(19,4) NOT NULL DEFAULT '0', 
                "status" "lpo_status_enum" NOT NULL DEFAULT 'OPEN', 
                "expected_delivery_date" date, 
                "created_by_user_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_lpo_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_lpo_number" UNIQUE ("lpo_number")
            )
        `);

    // --- 3. CONSTRAINTS (Missing Foreign Keys) ---
    await queryRunner.query(`
            DO $$ BEGIN
                -- project_audit -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_audit_project') THEN
                    ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
                -- project_audit -> user
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_audit_performer') THEN
                    ALTER TABLE "project_audit" ADD CONSTRAINT "FK_project_audit_performer" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                
                -- project_inflow -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_inflow_project') THEN
                    ALTER TABLE "project_inflow" ADD CONSTRAINT "FK_project_inflow_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;

                -- lpo -> project
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lpo_project') THEN
                    ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_project" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                -- lpo -> wbs
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_lpo_wbs') THEN
                    ALTER TABLE "lpo" ADD CONSTRAINT "FK_lpo_wbs" FOREIGN KEY ("wbs_id") REFERENCES "wbs_budget"("wbs_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lpo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_inflow"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_audit"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lpo_status_enum"`);
  }
}
