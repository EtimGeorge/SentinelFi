import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialPublicSchema1703980800000 implements MigrationInterface { // Use a fixed, unique timestamp

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tenants Table
        await queryRunner.query(`
            CREATE TABLE "tenants" (
                "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "project_name" character varying(255) NOT NULL,
                "schema_name" character varying(63) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tenant_name" UNIQUE ("name"),
                CONSTRAINT "UQ_schema_name" UNIQUE ("schema_name"),
                CONSTRAINT "PK_tenant_id" PRIMARY KEY ("id")
            )
        `);

        // User Role Enum (COMMENTED OUT FOR DEBUGGING)
        // await queryRunner.query(`
        //     DO $$ BEGIN
        //         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        //             CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'IT Head', 'Finance', 'Operational Head', 'CEO', 'Assigned Project User');
        //         END IF;
        //     END $$;
        // `);

        // User Table (COMMENTED OUT FOR DEBUGGING)
        // await queryRunner.query(`
        //     CREATE TABLE "user" (
        //         "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
        //         "email" character varying NOT NULL,
        //         "password_hash" character varying NOT NULL,
        //         "role" "public"."user_role_enum" NOT NULL DEFAULT 'Assigned Project User',
        //         "is_active" boolean NOT NULL DEFAULT true,
        //         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        //         "tenant_id" uuid,
        //         "reset_password_token" character varying,
        //         "reset_password_expires" TIMESTAMP WITH TIME ZONE,
        //         CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        //         CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
        //     )
        // `);

        // WbsCategory Table (COMMENTED OUT FOR DEBUGGING)
        // await queryRunner.query(`
        //     CREATE TABLE "wbs_category" (
        //         "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
        //         "code" character varying(50) NOT NULL,
        //         "description" character varying(255) NOT NULL,
        //         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        //         CONSTRAINT "UQ_wbs_category_code" UNIQUE ("code"),
        //         CONSTRAINT "PK_wbs_category_id" PRIMARY KEY ("id")
        //     )
        // `);

        // Foreign Key for User (linking to Tenants) (COMMENTED OUT FOR DEBUGGING)
        // await queryRunner.query(`
        //     DO $$ BEGIN
        //         IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_tenant') THEN
        //             ALTER TABLE "user" ADD CONSTRAINT "FK_user_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        //         END IF;
        //     END $$;
        // `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_tenant"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wbs_category"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }
}
