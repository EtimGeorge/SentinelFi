const { Client } = require('pg');
require('dotenv').config({path:'backend/.env'});
const url=process.env.DATABASE_URL;
const c=new Client({connectionString:url, ssl:{rejectUnauthorized:false}});
(async()=>{
  await c.connect();
  const tenants = await c.query('SELECT tenant_id, schema_name, name FROM public.tenants');
  for(const t of tenants.rows){
    const schema=t.schema_name;
    console.log('\n=== Testing schema',schema,'(' + t.name + ') ===');
    // Simulate WbsService.findAllWbsBudgets query - simplified version of getManyAndCount selects
    // Set search_path to schema, public (so TypeORM would work)
    await c.query(`SET search_path TO "${schema}", public`);
    // Test 1: SELECT project with deleted_at filter (TypeORM soft-delete)
    try{
      const res = await c.query(`SELECT "project"."project_id" FROM "project" WHERE "project"."deleted_at" IS NULL LIMIT 1`);
      console.log('project soft-delete query OK rows',res.rows.length);
    }catch(e){ console.log('project query FAILED',e.message)}
    // Test 2: WBS budgets with joins like service
    try{
      const res = await c.query(`SELECT "wbs"."wbs_id", "project"."project_code", "project"."deleted_at", "wbs"."deleted_at" FROM "wbs_budget" "wbs" LEFT JOIN "project" "project" ON "project"."project_id"="wbs"."project_id" AND "project"."deleted_at" IS NULL WHERE "wbs"."tenant_id"=$1 AND "wbs"."deleted_at" IS NULL ORDER BY "wbs"."sort_order" ASC LIMIT 1`,[t.tenant_id]);
      console.log('wbs+project join OK rows',res.rows.length);
    }catch(e){ console.log('WBS join FAILED',e.message)}
    // Test distinct query similar to failing one (with sortBy created_at)
    try{
      const res = await c.query(`SELECT "wbs"."wbs_id" FROM "wbs_budget" "wbs" LEFT JOIN "project" "project" ON "project"."project_id"="wbs"."project_id" WHERE "wbs"."tenant_id"=$1 AND "wbs"."deleted_at" IS NULL ORDER BY "wbs"."created_at" ASC LIMIT 1`,[t.tenant_id]);
      console.log('wbs sort created_at OK rows',res.rows.length);
    }catch(e){ console.log('wbs sort FAILED',e.message)}
    // Test projects findAll with rollup subqueries
    try{
      // simplified rollup check - check project with subqueries
      const res = await c.query(`SELECT p."project_id", p."project_code", p."deleted_at", (SELECT COALESCE(SUM(wbs.total_cost_budgeted),0) FROM wbs_budget wbs WHERE wbs.project_id = p.project_id) as total FROM "project" p WHERE p.tenant_id=$1 AND p.deleted_at IS NULL LIMIT 1`,[t.tenant_id]);
      console.log('projects rollup OK rows',res.rows.length, 'sample',res.rows[0]);
    }catch(e){ console.log('projects rollup FAILED',e.message)}
    // Test live_expense query with approval_status
    try{
      const res = await c.query(`SELECT id, approval_status, deleted_at FROM "live_expense" WHERE tenant_id=$1 AND deleted_at IS NULL LIMIT 1`,[t.tenant_id]);
      console.log('live_expense OK rows',res.rows.length);
    }catch(e){ console.log('live_expense FAILED',e.message)}
    // Test wbs_category
    try{
      const res = await c.query(`SELECT id, code, is_active, deleted_at FROM "wbs_category" WHERE tenant_id=$1 AND deleted_at IS NULL LIMIT 1`,[t.tenant_id]);
      console.log('wbs_category OK rows',res.rows.length);
    }catch(e){ console.log('wbs_category FAILED',e.message)}
    // Count projects and wbs
    const pc = await c.query(`SELECT COUNT(*) FROM "project" WHERE tenant_id=$1 AND deleted_at IS NULL`,[t.tenant_id]);
    const wc = await c.query(`SELECT COUNT(*) FROM "wbs_budget" WHERE tenant_id=$1 AND deleted_at IS NULL`,[t.tenant_id]);
    console.log('counts project',pc.rows[0].count,' wbs',wc.rows[0].count);
  }
  await c.end();
})();
