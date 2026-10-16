import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignOpexEnumsCanonical1774100000000 implements MigrationInterface {
  name = "AlignOpexEnumsCanonical1774100000000";

  private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
    const result = await queryRunner.query(`SELECT to_regclass('public.' || $1) AS exists`, [tableName]);
    return result.rows[0]?.exists !== null;
  }

  private async enumHasValue(queryRunner: QueryRunner, enumName: string, value: string): Promise<boolean> {
    const result = await queryRunner.query(`SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = $1 AND n.nspname = 'public' AND e.enumlabel = $2 LIMIT 1`, [enumName, value]);
    return result.rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await this.tableExists(queryRunner, "operational_budget");
    if (!exists) return;
    await this.alignTypeEnum(queryRunner);
    await this.alignStatusEnum(queryRunner);
  }

  private async alignTypeEnum(queryRunner: QueryRunner): Promise<void> {
    const ncw = !(await this.enumHasValue(queryRunner, "operational_budget_type_enum", "company_wide"));
    const nd = !(await this.enumHasValue(queryRunner, "operational_budget_type_enum", "departmental"));
    const nps = !(await this.enumHasValue(queryRunner, "operational_budget_type_enum", "project_specific"));
    const nr = !(await this.enumHasValue(queryRunner, "operational_budget_type_enum", "recurring"));
    if (!ncw && !nd && !nps && !nr) return;
    const legacy = await this.enumHasValue(queryRunner, "operational_budget_type_enum", "company-wide");
    if (legacy) {
      await queryRunner.query(`ALTER TYPE "public"."operational_budget_type_enum" RENAME TO "operational_budget_type_enum_old"`);
      await queryRunner.query(`CREATE TYPE "public"."operational_budget_type_enum" AS ENUM('company_wide', 'departmental', 'project_specific', 'recurring')`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" DROP DEFAULT`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" TYPE "public"."operational_budget_type_enum" USING (CASE "type"::text WHEN 'company-wide' THEN 'company_wide'::"public"."operational_budget_type_enum" WHEN 'recurring' THEN 'recurring'::"public"."operational_budget_type_enum" ELSE "type"::text::"public"."operational_budget_type_enum" END)`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" SET DEFAULT 'company_wide'`);
      await queryRunner.query(`DROP TYPE "public"."operational_budget_type_enum_old"`);
    } else {
      if (ncw) await queryRunner.query(`ALTER TYPE "public"."operational_budget_type_enum" ADD VALUE 'company_wide'`);
      if (nd) await queryRunner.query(`ALTER TYPE "public"."operational_budget_type_enum" ADD VALUE 'departmental'`);
      if (nps) await queryRunner.query(`ALTER TYPE "public"."operational_budget_type_enum" ADD VALUE 'project_specific'`);
      if (nr) await queryRunner.query(`ALTER TYPE "public"."operational_budget_type_enum" ADD VALUE 'recurring'`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "type" SET DEFAULT 'company_wide'`);
    }
  }

  private async alignStatusEnum(queryRunner: QueryRunner): Promise<void> {
    const na = !(await this.enumHasValue(queryRunner, "operational_budget_status_enum", "active"));
    const ni = !(await this.enumHasValue(queryRunner, "operational_budget_status_enum", "inactive"));
    const na2 = !(await this.enumHasValue(queryRunner, "operational_budget_status_enum", "archived"));
    if (!na && !ni && !na2) return;
    const legacy = await this.enumHasValue(queryRunner, "operational_budget_status_enum", "closed");
    if (legacy) {
      await queryRunner.query(`ALTER TYPE "public"."operational_budget_status_enum" RENAME TO "operational_budget_status_enum_old"`);
      await queryRunner.query(`CREATE TYPE "public"."operational_budget_status_enum" AS ENUM('active', 'inactive', 'archived')`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" DROP DEFAULT`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" TYPE "public"."operational_budget_status_enum" USING (CASE "status"::text WHEN 'closed' THEN 'inactive'::"public"."operational_budget_status_enum" ELSE "status"::text::"public"."operational_budget_status_enum" END)`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" SET DEFAULT 'active'`);
      await queryRunner.query(`DROP TYPE "public"."operational_budget_status_enum_old"`);
    } else {
      if (na) await queryRunner.query(`ALTER TYPE "public"."operational_budget_status_enum" ADD VALUE 'active'`);
      if (ni) await queryRunner.query(`ALTER TYPE "public"."operational_budget_status_enum" ADD VALUE 'inactive'`);
      if (na2) await queryRunner.query(`ALTER TYPE "public"."operational_budget_status_enum" ADD VALUE 'archived'`);
      await queryRunner.query(`ALTER TABLE "public"."operational_budget" ALTER COLUMN "status" SET DEFAULT 'active'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await this.tableExists(queryRunner, "operational_budget");
    if (!exists) return;
    await queryRunner.query(`SELECT 1`);
  }
}