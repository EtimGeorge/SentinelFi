import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScalabilityIndices1774100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // We add these indices to all tenant schemas.
    const schemas = await queryRunner.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')`
    );

    for (const { schema_name } of schemas) {
      // 1. operational_expense indices
      const opexTable = `"${schema_name}"."operational_expense"`;
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_TENANT_EXPENSE_DATE" ON ${opexTable} ("tenant_id", "expense_date")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_TENANT_OPEX_CATEGORY" ON ${opexTable} ("tenant_id", "operational_budget_category_id")`);

      // 2. wbs_budget indices
      const wbsTable = `"${schema_name}"."wbs_budget"`;
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_TENANT_PROJECT" ON ${wbsTable} ("tenant_id", "project_id")`);

      // 3. live_expense indices
      const liveTable = `"${schema_name}"."live_expense"`;
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_TENANT_WBS_DATE" ON ${liveTable} ("tenant_id", "wbs_id", "expense_date")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_TENANT_PROJ_DATE" ON ${liveTable} ("tenant_id", "project_id", "expense_date")`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemas = await queryRunner.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')`
    );

    for (const { schema_name } of schemas) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema_name}"."IDX_TENANT_EXPENSE_DATE"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema_name}"."IDX_TENANT_OPEX_CATEGORY"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema_name}"."IDX_TENANT_PROJECT"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema_name}"."IDX_TENANT_WBS_DATE"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "${schema_name}"."IDX_TENANT_PROJ_DATE"`);
    }
  }
}
