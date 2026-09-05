const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  for (const schema of ['saencrystal_global_services','solution_energy']) {
    const projCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='project' ORDER BY ordinal_position`, [schema]);
    console.log(schema, 'project columns', projCols.rows.map(r=>r.column_name).join(','));
    const hasDeleted = projCols.rows.some(r=>r.column_name==='deleted_at');
    console.log(schema, 'has deleted_at?', hasDeleted);
    const wbsCount = await c.query(`SELECT count(*) FROM "${schema}".wbs_budget`);
    console.log(schema, 'wbs_budget count', wbsCount.rows[0].count);
    const liveCount = await c.query(`SELECT count(*) FROM "${schema}".live_expense`);
    console.log(schema, 'live_expense count', liveCount.rows[0].count);
    const projCount = await c.query(`SELECT count(*) FROM "${schema}".project`);
    console.log(schema, 'project count', projCount.rows[0].count);
    try {
      const test = await c.query(`SELECT wbs.wbs_id FROM "${schema}".wbs_budget wbs LEFT JOIN "${schema}".project project ON project.project_id = wbs.project_id AND project.deleted_at IS NULL WHERE wbs.tenant_id='test' LIMIT 1`);
      console.log(schema, 'test join ok');
    } catch(e) { console.log(schema, 'test join error', e.message); }
  }
  await c.end();
}).catch(e=>{console.error(e);});
