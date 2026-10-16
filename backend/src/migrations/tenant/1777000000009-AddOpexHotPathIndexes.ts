import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * pgvector-free index pass for the hottest OPEX / procurement access paths
 * that the existing composite-index migrations missed.
 *
 * `1777000000001-AddTenantCompositeIndexes` already covers the P2P document
 * lists, approval queues and OPEX window lookups. Two gaps remained:
 *
 *  1. `payroll_entry` had NO indexes at all — not even on `tenant_id`. Every
 *     payroll aggregation (`SUM(net_pay) GROUP BY operational_budget_id`) and
 *     the payroll list scan therefore seq-scanned the whole table, and the
 *     `operational_budget_id` FK had no supporting index for referential
 *     maintenance. This is the clearest missing-index finding.
 *
 *  2. `opex_encumbrance` was indexed on `(tenant_id, operational_budget_id)`,
 *     but `getActiveEncumbrancesForBudget` filters on
 *     `(tenant_id, operational_budget_id, status IN (RESERVED, FIRM))`. Adding
 *     `status` lets the index satisfy the whole predicate instead of filtering
 *     the terminal states out after the fetch.
 *
 * Idempotent (`IF NOT EXISTS`) so it is safe to re-run against tenants that
 * already carry some of these indexes.
 */
export class AddOpexHotPathIndexes1777000000009 implements MigrationInterface {
  name = "AddOpexHotPathIndexes1777000000009";

  private async setSchema(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}"`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.setSchema(queryRunner);

    // payroll_entry: tenant scoping + the FK + the two real query shapes.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payroll_entry_tenant"
        ON "payroll_entry" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payroll_entry_budget"
        ON "payroll_entry" ("operational_budget_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payroll_entry_tenant_budget"
        ON "payroll_entry" ("tenant_id", "operational_budget_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payroll_entry_tenant_status"
        ON "payroll_entry" ("tenant_id", "status")`,
    );

    // opex_encumbrance: cover the active-pipeline predicate including status.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_opex_encumbrance_budget_status"
        ON "opex_encumbrance" ("tenant_id", "operational_budget_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.setSchema(queryRunner);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_opex_encumbrance_budget_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payroll_entry_tenant_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payroll_entry_tenant_budget"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payroll_entry_budget"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payroll_entry_tenant"`,
    );
  }
}
