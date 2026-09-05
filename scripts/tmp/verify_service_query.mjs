import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");

// No entity imports needed – use raw SQL to mimic ProjectsService query builder behavior (generic, no hardcoded tenant)

const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();

const tenants = await ds.query(`SELECT tenant_id, schema_name, name FROM public.tenants WHERE is_active=true`);
console.log("Tenants:", tenants.map(t=>`${t.name} -> ${t.schema_name}`));

for(const t of tenants){
  const schema = t.schema_name;
  const tenantId = t.tenant_id;
  console.log(`\n=== Verifying service queries for ${t.name} (${schema}) tenant_id=${tenantId} ===`);
  // Set search_path to tenant schema like TenancyAwareDataSource does
  await ds.query(`SET search_path TO "${schema}", public`);
  try{
    // Mimic ProjectsService.findAll query with leftJoinAndSelect client and createdBy + rollup subqueries
    // Use raw query builder via DataSource.getRepository approach
    // Simpler: use raw SQL that mirrors ProjectsService
    const projectsRaw = await ds.query(`
      SELECT project.project_id, project.project_name, project.project_code, project.deleted_at,
             client.id as client_id, client.name as client_name,
             "user".id as user_id
      FROM "${schema}".project AS project
      LEFT JOIN "${schema}".clients AS client ON client.id = project.client_id
      LEFT JOIN public."user" AS "user" ON "user".id = project.created_by_user_id
      WHERE project.tenant_id = $1 AND project.deleted_at IS NULL
      ORDER BY project.project_name ASC
      LIMIT 100
    `,[tenantId]);
    console.log(` Projects query OK: ${projectsRaw.length} rows`);
    // Rollup subqueries
    const rollup = await ds.query(`
      SELECT project.project_id,
        (SELECT COALESCE(SUM(wbs.total_cost_budgeted),0) FROM "${schema}".wbs_budget AS wbs WHERE wbs.project_id=project.project_id) as total_budgeted_rollup,
        (SELECT COALESCE(SUM(expense.amount),0) FROM "${schema}".live_expense AS expense INNER JOIN "${schema}".wbs_budget AS wbs_for_expense ON wbs_for_expense.wbs_id=expense.wbs_id WHERE wbs_for_expense.project_id=project.project_id) as total_paid_rollup,
        (SELECT COALESCE(SUM(inflow.amount_received),0) FROM "${schema}".project_inflow AS inflow WHERE inflow.project_id=project.project_id) as total_inflow_rollup
      FROM "${schema}".project AS project WHERE project.tenant_id=$1 LIMIT 5
    `,[tenantId]);
    console.log(` Rollup query OK:`, JSON.stringify(rollup,null,2));
    // Dashboard summary queries
    const budgetSum = await ds.query(`SELECT SUM(wbs.total_cost_budgeted) as total FROM "${schema}".wbs_budget AS wbs WHERE wbs.tenant_id=$1 AND wbs.parent_wbs_id IS NULL`,[tenantId]);
    const expenseSum = await ds.query(`SELECT SUM(expense.amount) as total FROM "${schema}".live_expense AS expense WHERE expense.tenant_id=$1`,[tenantId]);
    const pending = await ds.query(`SELECT COUNT(*) as cnt FROM "${schema}".wbs_budget AS wbs WHERE wbs.tenant_id=$1 AND wbs.status IN ('draft','pending')`,[tenantId]);
    console.log(` Dashboard summary OK: budget=${budgetSum[0].total} expense=${expenseSum[0].total} pending=${pending[0].cnt}`);
    // Test live_expense vendor_name hydration (the previous 500 cause)
    const expenses = await ds.query(`SELECT id, vendor_name, amount FROM "${schema}".live_expense WHERE tenant_id=$1 LIMIT 2`,[tenantId]);
    console.log(` LiveExpense vendor_name query OK: ${expenses.length} rows`, expenses);
  }catch(e){
    console.error(` FAILED for ${schema}:`, e.message, e.stack);
    process.exit(1);
  }
}
await ds.destroy();
console.log("\nAll service queries verified successfully for all tenants (generic, no hardcoded names).");
