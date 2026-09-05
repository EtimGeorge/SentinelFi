import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config({ path: "D:/DOCUMENTS/Development/SentinelFi/backend/.env" });
let url = (process.env.DATABASE_URL || "").trim().replace(/^['"]|['"]$/g, "");
if (url.startsWith("postgresql://")) url = url.replace("postgresql://", "postgres://");
const ds = new DataSource({ type: "postgres", url, ssl: { rejectUnauthorized: false } });
await ds.initialize();

async function check(schema){
  console.log("==== SCHEMA ",schema," ====");
  // check tenants
  const tenants = await ds.query(`SELECT tenant_id, schema_name, name FROM public.tenants ORDER BY name`);
  console.log("tenants",JSON.stringify(tenants,null,2));
  // column checks
  const expected = {
    live_expense: ["id","tenant_id","project_id","wbs_id","category_id","updated_at","user_id","expense_date","description","vendor_name","unit_cost","quantity","days","commitment_lpo_amount","amount","vat_amount","wht_amount","document_reference","notes_justification","variance_flag","approval_status","override_reason","created_at","deleted_at"],
    wbs_budget: ["wbs_id","project_id","parent_wbs_id","category_id","wbs_code","description","unit_cost_budgeted","quantity_budgeted","days_budgeted","uom","custom_metadata","total_cost_budgeted","total_cost_actual","total_committed_lpo","quantity_actual","days_actual","status","sort_order","created_at","updated_at","tenant_id","deleted_at","user_id"],
    project: ["project_id","project_code","project_name","rfq_number","sow_details","notes","status","currency","contract_value","contingency_percent","vat_rate","wht_rate","created_at","updated_at","deleted_at","tenant_id","client_id","created_by_user_id"],
    clients: ["id","tenant_id","name","email","phone","address","industry","is_active","created_at","updated_at","deleted_at"]
  };
  for(const tbl in expected){
    const cols = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`,[schema,tbl]);
    const dbCols = cols.map(c=>c.column_name);
    const missing = expected[tbl].filter(c=>!dbCols.includes(c));
    const extra = dbCols.filter(c=>!expected[tbl].includes(c));
    console.log(`TABLE ${tbl}: db=[${dbCols.join(",")}] missing=[${missing.join(",")}] extra=[${extra.join(",")}]`);
  }
  // check live_expense vendor_name specifically
  // also try to run the failing query
  try{
    await ds.query(`SET search_path TO ${schema}, public`);
    console.log("SET search_path ok");
    // simulate ProjectsService findAll
    const res = await ds.query(`SELECT project.project_id FROM "${schema}".project AS project WHERE project.tenant_id=$1 LIMIT 1`,[tenants.find(t=>t.schema_name===schema)?.tenant_id || tenants[0].tenant_id]);
    console.log("simple project select ok",res.length);
    // now try the join query
    const tenantId = tenants.find(t=>t.schema_name===schema)?.tenant_id;
    if(tenantId){
      // This mimics createQueryBuilder leftJoinAndSelect client and user
      const sql = `SELECT project.project_id, project.project_name, project.project_code, project.deleted_at, client.id as client_id, "user".id as user_id FROM "${schema}".project AS project LEFT JOIN "${schema}".clients AS client ON client.id=project.client_id LEFT JOIN public."user" AS "user" ON "user".id=project.created_by_user_id WHERE project.tenant_id=$1 AND project.deleted_at IS NULL LIMIT 5`;
      const res2 = await ds.query(sql,[tenantId]);
      console.log("join query ok rows",res2.length);
    }
    // Try rollup subqueries
    if(tenantId){
      const sql3 = `SELECT project.project_id,
        (SELECT COALESCE(SUM(wbs.total_cost_budgeted),0) FROM "${schema}".wbs_budget AS wbs WHERE wbs.project_id=project.project_id) as total_budgeted_rollup,
        (SELECT COALESCE(SUM(expense.amount),0) FROM "${schema}".live_expense AS expense INNER JOIN "${schema}".wbs_budget AS wbs_for_expense ON wbs_for_expense.wbs_id=expense.wbs_id WHERE wbs_for_expense.project_id=project.project_id) as total_paid_rollup,
        (SELECT COALESCE(SUM(inflow.amount_received),0) FROM "${schema}".project_inflow AS inflow WHERE inflow.project_id=project.project_id) as total_inflow_rollup
        FROM "${schema}".project AS project WHERE project.tenant_id=$1 LIMIT 2`;
      const res3 = await ds.query(sql3,[tenantId]);
      console.log("rollup query ok",JSON.stringify(res3,null,2));
    }
    // Dashboard queries
    if(tenantId){
      const b = await ds.query(`SELECT SUM(wbs.total_cost_budgeted) as total FROM "${schema}".wbs_budget AS wbs WHERE wbs.tenant_id=$1 AND wbs.parent_wbs_id IS NULL`,[tenantId]);
      console.log("dashboard budget sum",b);
      const e = await ds.query(`SELECT SUM(expense.amount) as total FROM "${schema}".live_expense AS expense WHERE expense.tenant_id=$1`,[tenantId]);
      console.log("dashboard expense sum",e);
      const p = await ds.query(`SELECT COUNT(*) as cnt FROM "${schema}".wbs_budget AS wbs WHERE wbs.tenant_id=$1 AND wbs.status IN ('DRAFT','PENDING')`,[tenantId]);
      console.log("pending count",p);
      // executive lpo
      const l = await ds.query(`SELECT SUM(lpo.amount_committed) as total FROM "${schema}".lpo AS lpo WHERE lpo.tenant_id=$1 AND lpo.status IN ('OPEN','PARTIALLY_PAID')`,[tenantId]);
      console.log("lpo sum",l);
    }
  }catch(e){
    console.error("query error for schema",schema, e.message, e.stack);
  }
  console.log("");
}
await check("saencrystal_global_services");
await check("solution_energy");
await ds.destroy();
