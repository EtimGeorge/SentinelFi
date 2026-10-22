import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCEOAnnotation1773050000002 implements MigrationInterface {
  name = "AddCEOAnnotation1773050000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // Create the enum type if it doesn't exist (using IF NOT EXISTS is safer for manual migrations)
    await queryRunner.query(
      `DO $$ BEGIN
                CREATE TYPE "ceo_annotation_target_type_enum" AS ENUM('WBS', 'EXPENSE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ceo_annotation" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "tenant_id" uuid NOT NULL, 
                "target_type" "ceo_annotation_target_type_enum" NOT NULL, 
                "target_id" uuid NOT NULL, 
                "content" text NOT NULL, 
                "author_id" uuid NOT NULL, 
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_ceo_annotation_id" PRIMARY KEY ("id")
            )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ceo_annotation_tenant_target" ON "ceo_annotation" ("tenant_id", "target_type", "target_id")`,
    );

    // Add foreign key constraint to user table (assumed to be in public schema or accessible via search_path)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ceo_annotation_author') THEN
          ALTER TABLE "ceo_annotation" ADD CONSTRAINT "FK_ceo_annotation_author" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ceo_annotation_author') THEN
          ALTER TABLE "ceo_annotation" DROP CONSTRAINT "FK_ceo_annotation_author";
        END IF;
      END $$;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ceo_annotation_tenant_target"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ceo_annotation"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ceo_annotation_target_type_enum"`);
  }
}
