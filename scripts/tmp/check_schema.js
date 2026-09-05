const { Client } = require('pg');
require('dotenv').config({path:'backend/.env'});
const url=process.env.DATABASE_URL;
const c=new Client({connectionString:url, ssl:{rejectUnauthorized:false}});
(async()=>{
  await c.connect();
  const tenants=await c.query('SELECT tenant_id, name, schema_name FROM public.tenants');
  console.log(JSON.stringify(tenants.rows,null,2));
  for(const t of tenants.rows){
    const schema=t.schema_name;
    console.log('\n--- schema '+schema+' ---');
    const cols=await c.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name IN ('project','wbs_budget','wbs_category','live_expense','lpo','project_inflow','operational_budget','operational_budget_category','operational_expense') ORDER BY table_name, column_name",[schema]);
    const grouped={};
    for(const r of cols.rows){ (grouped[r.table_name]=grouped[r.table_name]||[]).push(r.column_name); }
    console.log(JSON.stringify(grouped,null,2));
    const projCols=grouped['project']||[];
    console.log('project has project_code? '+(projCols.includes('project_code')));
    console.log('project has deleted_at? '+(projCols.includes('deleted_at')));
    console.log('project columns: ',projCols);
    console.log('wbs_budget has deleted_at? '+((grouped['wbs_budget']||[]).includes('deleted_at')));
    console.log('wbs_category has deleted_at? '+((grouped['wbs_category']||[]).includes('deleted_at')));
    console.log('lpo has deleted_at? '+((grouped['lpo']||[]).includes('deleted_at')));
    console.log('project_inflow has deleted_at? '+((grouped['project_inflow']||[]).includes('deleted_at')));
    try{
      const migs=await c.query('SELECT name FROM "'+schema+'"."tenant_migrations" ORDER BY name');
      console.log('migrations '+migs.rows.map(r=>r.name).join(', '));
    }catch(e){ console.log('migrations error '+e.message)}
  }
  await c.end();
})().catch(e=>{console.error(e); process.exit(1)});
