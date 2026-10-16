/**
 * BE-5: canonical outstanding-commitment query shared by every CAPEX spend
 * path (WBS single/batch expense logging, expense correction, LPO creation).
 *
 * Previously each path inlined its own variant with different filters, so the
 * same budget answered differently depending on the entry point. The unified
 * rule:
 *  - LPO leg counts unpaid balances on live commitments: approval_status in
 *    (APPROVED, PENDING_APPROVAL) — a pending LPO is real upcoming spend and
 *    ignoring it lets parallel over-budget requests slip through — while
 *    CANCELLED and CLOSED lines are dead and excluded.
 *  - Expense leg counts PENDING_APPROVAL lines (approved lines already sit in
 *    the WBS actuals, so counting them again would double-book).
 */
export const OUTSTANDING_COMMITMENT_SQL = `SELECT
   (SELECT COALESCE(SUM(amount_committed - amount_paid), 0)
      FROM lpo
     WHERE wbs_id = $1 AND tenant_id = $2
       AND approval_status IN ('APPROVED', 'PENDING_APPROVAL')
       AND status NOT IN ('CANCELLED', 'CLOSED')) +
   (SELECT COALESCE(SUM(amount), 0)
      FROM live_expense
     WHERE wbs_id = $1 AND tenant_id = $2
       AND approval_status = 'PENDING_APPROVAL')
 AS total`;

export interface SqlQueryable {
  query: (sql: string, params: unknown[]) => Promise<Array<{ total?: unknown }>>;
}

export async function queryOutstandingCommitment(
  queryable: SqlQueryable,
  wbsId: string,
  tenantId: string,
): Promise<number> {
  const rows = await queryable.query(OUTSTANDING_COMMITMENT_SQL, [
    wbsId,
    tenantId,
  ]);
  return parseFloat(String(rows?.[0]?.total ?? 0)) || 0;
}
