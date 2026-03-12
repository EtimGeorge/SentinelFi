import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantClientArchitecture1770291298000 implements MigrationInterface {
    name = 'TenantClientArchitecture1770291298000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create Clients table in tenant schema
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "clients" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "tenant_id" uuid NOT NULL, 
            "name" character varying NOT NULL, 
            "email" character varying, 
            "phone" character varying, 
            "address" text, 
            "industry" character varying, 
            "is_active" boolean NOT NULL DEFAULT true, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_clients_id" PRIMARY KEY ("id")
        )`);

        // 2. Create CEO Annotations infrastructure
        // Note: We use string-based check for the enum type
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ceo_annotation_target_type_enum') THEN
                    CREATE TYPE "ceo_annotation_target_type_enum" AS ENUM('WBS', 'EXPENSE');
                END IF;
            END $$;
        `);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "ceo_annotation" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "tenant_id" uuid NOT NULL, 
            "target_type" "ceo_annotation_target_type_enum" NOT NULL, 
            "target_id" uuid NOT NULL, 
            "content" text NOT NULL, 
            "author_id" uuid NOT NULL, 
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
            CONSTRAINT "PK_ceo_annotation_id" PRIMARY KEY ("id")
        )`);
        
        await queryRunner.query(`CREATE INDEX "IDX_ceo_annotation_context" ON "ceo_annotation" ("tenant_id", "target_type", "target_id")`);

        // 3. Alter Project table (lives in tenant schema)
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project' AND column_name = 'client_id') THEN
                    ALTER TABLE "project" ADD "client_id" uuid;
                END IF;
            END $$;
        `);
        
        // 4. Constraints
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_clients_tenant') THEN
                    ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_project_client') THEN
                    ALTER TABLE "project" ADD CONSTRAINT "FK_project_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ceo_annotation_author') THEN
                    ALTER TABLE "ceo_annotation" ADD CONSTRAINT "FK_ceo_annotation_author" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ceo_annotation" DROP CONSTRAINT "FK_ceo_annotation_author"`);
        await queryRunner.query(`ALTER TABLE "project" DROP CONSTRAINT "FK_project_client"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_clients_tenant"`);
        
        await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "client_id"`);
        
        await queryRunner.query(`DROP TABLE "ceo_annotation"`);
        await queryRunner.query(`DROP TYPE "ceo_annotation_target_type_enum"`);
        await queryRunner.query(`DROP TABLE "clients"`);
    }
}
