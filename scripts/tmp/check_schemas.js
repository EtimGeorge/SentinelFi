const { DataSource } = require('typeorm');
require('dotenv').config({path: 'D:/DOCUMENTS/Development/SentinelFi/backend/.env'});
let url = process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, '').replace('postgresql://','postgres://');
async function check(schema){
  const ds = new DataSource({type:'postgres', url, ssl:{rejectUnauthorized:false}, schema});
  await ds.initialize();
  console.log('=== SCHEMA', schema, '===');
  const cols = await ds.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='${schema}' AND table_name IN ('project','wbs_budget','wbs_category','live_expense','lpo','project_inflow','ceo_annotation','wbs_template','budget_ledger','operational_budget') ORDER BY table_name, column_name`);
  let cur='';
  for(let r of cols){ if(r.table_name!==cur){ console.log('\n--',r.table_name,'--'); cur=r.table_name } console.log(r.column_name, r.data_type) }
  const projCols = cols.filter(c=>c.table_name==='project').map(c=>c.column_name);
  console.log('\nproject deleted_at exists?', projCols.includes('deleted_at'));
  console.log('project project_code exists?', projCols.includes('project_code'));
  console.log('project client_id exists?', projCols.includes('client_id'));
  console.log('project contract_value exists?', projCols.includes('contract_value'));
  // check tables existence
  const tables = await ds.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}'`);
  const tNames = tables.map(t=>t.table_name);
  console.log('\nAll tables:', tNames.sort().join(', '));
  console.log('has wbs_template?', tNames.includes('wbs_template'));
  console.log('has budget_ledger?', tNames.includes('budget_ledger'));
  console.log('has ceo_annotation?', tNames.includes('ceo_annotation'));
  try{
    const migs = await ds.query(`SELECT name FROM tenant_migrations ORDER BY name`);
    console.log('\nMigrations run:', migs.map(m=>m.name).join('\n'));
  }catch(e){ console.log('no migrations table', e.message)}
  // Try to mimic service query: project list with joins
  console.log('\n--- Mimic project query ---');
  try{
    const res = await ds.query(`SELECT project."project_id", project."project_name", project."deleted_at", project."project_code", project."client_id" FROM "${schema}"."project" project WHERE project."tenant_id" = $1 LIMIT 1`, ['00000000-0000-0000-0000-000000000000']);
    console.log('project select OK', res.length);
  }catch(e){ console.log('project select FAILED', e.message)}
  try{
    const res = await ds.query(`SELECT project."project_id", project."project_name", client."id" FROM "${schema}"."project" project LEFT JOIN "${schema}"."clients" client ON client."id"=project."client_id" WHERE project."tenant_id" = $1 LIMIT 1`, ['00000000-0000-0000-0000-000000000000']);
    console.log('project join client OK', res.length);
  }catch(e){ console.log('project join client FAILED', e.message)}
  // Dashboard queries
  console.log('\n--- Mimic dashboard queries ---');
  try{
    // getTenantSummary budget sum
    const r = await ds.query(`SELECT SUM(wbs.total_cost_budgeted) as total FROM "${schema}"."wbs_budget" wbs WHERE wbs.tenant_id = $1 AND wbs.parent_wbs_id IS NULL`, ['00000000-0000-0000-0000-000000000000']);
    console.log('dashboard budget sum OK', JSON.stringify(r));
  }catch(e){ console.log('dashboard budget sum FAILED', e.message)}
  try{
    const r = await ds.query(`SELECT SUM(expense.amount) as total FROM "${schema}"."live_expense" expense WHERE expense.tenant_id = $1`, ['00000000-0000-0000-0000-000000000000']);
    console.log('dashboard expense sum OK', JSON.stringify(r));
  }catch(e){ console.log('dashboard expense sum FAILED', e.message)}
  try{
    const r = await ds.query(`SELECT DATE(expense.expense_date) as date, SUM(expense.amount) as amount FROM "${schema}"."live_expense" expense WHERE expense.tenant_id = $1 AND expense.expense_date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(expense.expense_date) ORDER BY DATE(expense.expense_date) ASC`, ['00000000-0000-0000-0000-000000000000']);
    console.log('dashboard history OK', JSON.stringify(r));
  }catch(e){ console.log('dashboard history FAILED', e.message)}
  try{
    const r = await ds.query(`SELECT SUM(lpo.amount_committed) as total FROM "${schema}"."lpo" lpo WHERE lpo.tenant_id = $1 AND lpo.status IN ('OPEN','PARTIALLY_PAID')`, ['00000000-0000-0000-0000-000000000000']);
    console.log('dashboard lpo sum OK', JSON.stringify(r));
  }catch(e){ console.log('dashboard lpo sum FAILED', e.message)}
  // wbs templates
  console.log('\n--- Mimic wbs queries ---');
  try{
    const r = await ds.query(`SELECT * FROM "${schema}"."wbs_template" LIMIT 1`);
    console.log('wbs_template select OK', r.length);
  }catch(e){ console.log('wbs_template select FAILED', e.message)}
  try{
    const r = await ds.query(`SELECT TO_CHAR(le.expense_date, 'YYYY-MM') as month, COALESCE(wc.name, 'Uncategorized') as category, SUM(le.amount) as actual FROM "${schema}"."live_expense" le LEFT JOIN "${schema}"."wbs_budget" wb ON wb.wbs_id = le.wbs_id LEFT JOIN "${schema}"."wbs_category" wc ON wc.id = wb.category_id WHERE le.project_id = ANY($1) AND le.expense_date >= NOW() - INTERVAL '12 months' GROUP BY month, category ORDER BY month ASC`, [['00000000-0000-0000-0000-000000000000']]);
    console.log('capex monthlyBurn OK', JSON.stringify(r));
  }catch(e){ console.log('capex monthlyBurn FAILED', e.message)}
  await ds.destroy();
}
(async()=>{ await check('solution_energy'); console.log('\n============================\n'); await check('saencrystal_global_services'); })().catch(e=>{console.error(e); process.exit(1)})
