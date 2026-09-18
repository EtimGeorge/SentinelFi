import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Aligns the tenant-schema operational_budget enum types with the canonical
 * shared/types enum values.
 *
 * Follows the existing tenant-migration convention of hardcoding the tenant
 * schema name (see 1774046551047-AddSoftDeleteToOpexEntities.ts).
 *
 * Canonical values after this migration:
 *   type:   company_wide | departmental | project_specific | recurring
 *   status: active | inactive | archived
 */
export class AlignOpexEnumsCanonicalTenant1774100000001 implements MigrationInterface {
  name = "AlignOpexEnumsCanonicalTenant1774100000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- operational_budget_type ----
    await queryRunner.query(`
      ALTER TYPE "solution_energy"."operational_budget_type_enum"
        RENAME TO "operational_budget_type_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "solution_energy"."operational_budget_type_enum" AS ENUM(
        'company_wide', 'departmental', 'project_specific', 'recurring'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget" ALTER COLUMN "type" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "type" TYPE "solution_energy"."operational_budget_type_enum"
        USING (
          CASE "type"::text
            WHEN 'company-wide'
              THEN 'company_wide'::"solution_energy"."operational_budget_type_enum"
            WHEN 'recurring'
              THEN 'recurring'::"solution_energy"."operational_budget_type_enum"
            ELSE "type"::text::"solution_energy"."operational_budget_type_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "type" SET DEFAULT 'company_wide'
    `);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."operational_budget_type_enum_old"`,
    );

    // ---- operational_budget_status ----
    await queryRunner.query(`
      ALTER TYPE "solution_energy"."operational_budget_status_enum"
        RENAME TO "operational_budget_status_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "solution_energy"."operational_budget_status_enum" AS ENUM(
        'active', 'inactive', 'archived'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "status" TYPE "solution_energy"."operational_budget_status_enum"
        USING (
          CASE "status"::text
            WHEN 'closed'
              THEN 'inactive'::"solution_energy"."operational_budget_status_enum"
            ELSE "status"::text::"solution_energy"."operational_budget_status_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "status" SET DEFAULT 'active'
    `);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."operational_budget_status_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "solution_energy"."operational_budget_type_enum"
        RENAME TO "operational_budget_type_enum_canonical"
    `);
    await queryRunner.query(`
      CREATE TYPE "solution_energy"."operational_budget_type_enum" AS ENUM(
        'departmental', 'company-wide', 'recurring'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget" ALTER COLUMN "type" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "type" TYPE "solution_energy"."operational_budget_type_enum"
        USING (
          CASE "type"::text
            WHEN 'company_wide'
              THEN 'company-wide'::"solution_energy"."operational_budget_type_enum"
            WHEN 'project_specific'
              THEN 'recurring'::"solution_energy"."operational_budget_type_enum"
            ELSE "type"::text::"solution_energy"."operational_budget_type_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "type" SET DEFAULT 'company-wide'
    `);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."operational_budget_type_enum_canonical"`,
    );

    await queryRunner.query(`
      ALTER TYPE "solution_energy"."operational_budget_status_enum"
        RENAME TO "operational_budget_status_enum_canonical"
    `);
    await queryRunner.query(`
      CREATE TYPE "solution_energy"."operational_budget_status_enum" AS ENUM(
        'active', 'closed', 'archived'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget" ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "status" TYPE "solution_energy"."operational_budget_status_enum"
        USING (
          CASE "status"::text
            WHEN 'inactive'
              THEN 'closed'::"solution_energy"."operational_budget_status_enum"
            ELSE "status"::text::"solution_energy"."operational_budget_status_enum"
          END
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "solution_energy"."operational_budget"
        ALTER COLUMN "status" SET DEFAULT 'active'
    `);
    await queryRunner.query(
      `DROP TYPE "solution_energy"."operational_budget_status_enum_canonical"`,
    );
  }
}