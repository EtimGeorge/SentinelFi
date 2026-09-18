import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Aligns the public-schema operational_budget enum types with the canonical
 * shared/types enum values.
 *
 * Canonical values after this migration:
 *   type:   company_wide | departmental | project_specific | recurring
 *   status: active | inactive | archived
 *
 * Mapping from the legacy DB enum values:
 *   'company-wide' -> 'company_wide'
 *   'recurring'    -> 'recurring'  (unchanged)
 *   'closed'       -> 'inactive'
 */
export class AlignOpexEnumsCanonical1774100000000 implements MigrationInterface {
  name = "AlignOpexEnumsCanonical1774100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- operational_budget_type ----
    await queryRunner.query(`
      ALTER TYPE "public"."operational_budget_type_enum"
        RENAME TO "operational_budget_type_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."operational_budget_type_enum" AS ENUM(
        'company_wide', 'departmental', 'project_specific', 'recurring'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "type" TYPE "public"."operational_budget_type_enum"
        USING (
          CASE "type"::text
            WHEN 'company-wide'
              THEN 'company_wide'::"public"."operational_budget_type_enum"
            WHEN 'recurring'
              THEN 'recurring'::"public"."operational_budget_type_enum"
            ELSE "type"::text::"public"."operational_budget_type_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "type" SET DEFAULT 'company_wide'
    `);
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_type_enum_old"`,
    );

    // ---- operational_budget_status ----
    await queryRunner.query(`
      ALTER TYPE "public"."operational_budget_status_enum"
        RENAME TO "operational_budget_status_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."operational_budget_status_enum" AS ENUM(
        'active', 'inactive', 'archived'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "status" TYPE "public"."operational_budget_status_enum"
        USING (
          CASE "status"::text
            WHEN 'closed'
              THEN 'inactive'::"public"."operational_budget_status_enum"
            ELSE "status"::text::"public"."operational_budget_status_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "status" SET DEFAULT 'active'
    `);
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore legacy enum values, reverse-mapping canonical values.
    await queryRunner.query(`
      ALTER TYPE "public"."operational_budget_type_enum"
        RENAME TO "operational_budget_type_enum_canonical"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."operational_budget_type_enum" AS ENUM(
        'departmental', 'company-wide', 'recurring'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "type" TYPE "public"."operational_budget_type_enum"
        USING (
          CASE "type"::text
            WHEN 'company_wide'
              THEN 'company-wide'::"public"."operational_budget_type_enum"
            WHEN 'project_specific'
              THEN 'recurring'::"public"."operational_budget_type_enum"
            ELSE "type"::text::"public"."operational_budget_type_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "type" SET DEFAULT 'company-wide'
    `);
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_type_enum_canonical"`,
    );

    await queryRunner.query(`
      ALTER TYPE "public"."operational_budget_status_enum"
        RENAME TO "operational_budget_status_enum_canonical"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."operational_budget_status_enum" AS ENUM(
        'active', 'closed', 'archived'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "status" TYPE "public"."operational_budget_status_enum"
        USING (
          CASE "status"::text
            WHEN 'inactive'
              THEN 'closed'::"public"."operational_budget_status_enum"
            ELSE "status"::text::"public"."operational_budget_status_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "public"."operational_budget"
        ALTER COLUMN "status" SET DEFAULT 'active'
    `);
    await queryRunner.query(
      `DROP TYPE "public"."operational_budget_status_enum_canonical"`,
    );
  }
}