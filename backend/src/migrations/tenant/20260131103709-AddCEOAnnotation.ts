import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCEOAnnotation20260131103709 implements MigrationInterface {
  name = "AddCEOAnnotation20260131103709";

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
      `CREATE TABLE "ceo_annotation" (
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
      `CREATE INDEX "IDX_ceo_annotation_tenant_target" ON "ceo_annotation" ("tenant_id", "target_type", "target_id")`,
    );

    // Add foreign key constraint to user table (assumed to be in public schema or accessible via search_path)
    await queryRunner.query(
      `ALTER TABLE "ceo_annotation" ADD CONSTRAINT "FK_ceo_annotation_author" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }
    await queryRunner.query(
      `ALTER TABLE "ceo_annotation" DROP CONSTRAINT "FK_ceo_annotation_author"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_ceo_annotation_tenant_target"`);
    await queryRunner.query(`DROP TABLE "ceo_annotation"`);
    await queryRunner.query(`DROP TYPE "ceo_annotation_target_type_enum"`);
  }
}
