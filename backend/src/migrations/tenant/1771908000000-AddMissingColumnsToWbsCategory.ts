import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds all missing columns to wbs_category in the tenant schema.
 * The entity has been enhanced with: code, description, color, sort_order, parent_id, is_active
 * but these were never migrated to tenant schemas.
 */
export class AddMissingColumnsToWbsCategory1771908000000 implements MigrationInterface {
  name = "AddMissingColumnsToWbsCategory1771908000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add all missing columns that the entity defines but the tenant table lacks
    await queryRunner.query(`
            ALTER TABLE "wbs_category"
            ADD COLUMN IF NOT EXISTS "code" character varying(20),
            ADD COLUMN IF NOT EXISTS "description" text,
            ADD COLUMN IF NOT EXISTS "color" character varying(7),
            ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "parent_id" uuid,
            ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
        `);

    // Add the self-referencing foreign key for parent-child hierarchy
    // First check if it already exists to be idempotent
    const fkExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'FK_wbs_category_parent'
            AND table_name = 'wbs_category'
        `);
    if (fkExists.length === 0) {
      await queryRunner.query(`
                ALTER TABLE "wbs_category"
                ADD CONSTRAINT "FK_wbs_category_parent"
                FOREIGN KEY ("parent_id") REFERENCES "wbs_category"("id")
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP CONSTRAINT IF EXISTS "FK_wbs_category_parent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wbs_category" DROP COLUMN IF EXISTS "code"`,
    );
  }
}
