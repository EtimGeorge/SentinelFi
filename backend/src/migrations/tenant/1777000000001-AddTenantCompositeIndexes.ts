import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Composite indexes matching the dominant tenant-scoped access patterns:
 *   - Financial intelligence: trial balance by fiscal period, P2P list by status
 *   - Approval inbox: by document type + status + recency
 *   - Operational budgets: active budgets within a date window
 * These kill index-less sorts/filters that currently force seq scans per tenant.
 */
export class AddTenantCompositeIndexes1777000000001
  implements MigrationInterface
{
  name = "AddTenantCompositeIndexes1777000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM's `schema` option does not set session search_path (verified
    // against 0.3.28 source) — raw DDL below would resolve to the pooled
    // session's search_path (public by default on Neon), building the indexes
    // on public shadow tables instead of the tenant schema. Guard explicitly,
    // same as InitialTenantSchemaSetup.
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    // trial balance / ledger rollups group by fiscal period
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_budget_ledger_period" ON "budget_ledger" ("tenant_id", "fiscal_period_id", "cost_center_id", "gl_account_id")`,
    );
    // requisition + invoice lists are almost always (tenant, status, created)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_p2p_requisition_status_created" ON "p2p_requisition" ("tenant_id", "status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_p2p_requisition_requester_created" ON "p2p_requisition" ("tenant_id", "requester_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_p2p_po_requisition" ON "p2p_purchase_order" ("tenant_id", "requisition_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_p2p_invoice_po" ON "p2p_invoice" ("tenant_id", "purchase_order_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_p2p_invoice_status_created" ON "p2p_invoice" ("tenant_id", "status", "created_at")`,
    );
    // approval inbox: WHER tenant_id AND document_type AND status ORDER created_at
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_approval_log_inbox" ON "approval_log" ("tenant_id", "document_type", "status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_approval_log_document" ON "approval_log" ("tenant_id", "document_id", "created_at")`,
    );
    // operational budget window queries: explicit date ranges + status filter
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_op_budget_window" ON "operational_budget" ("tenant_id", "status", "start_date", "end_date")`,
    );
    // expense cross-filter by category + date (OPEX analytics)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_op_expense_category_date" ON "operational_expense" ("tenant_id", "operational_budget_category_id", "expense_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_budget_ledger_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_requisition_status_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_requisition_requester_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_po_requisition"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_invoice_po"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_p2p_invoice_status_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_inbox"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_approval_log_document"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_op_budget_window"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_op_expense_category_date"`);
  }
}