const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const schema = 'saencrystal_global_services';
  console.log('checking', schema);
  // Add deleted_at to project if missing
  const projCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='project'`, [schema]);
  const hasDeleted = projCols.rows.some(r=>r.column_name==='deleted_at');
  console.log('project has deleted_at?', hasDeleted);
  if (!hasDeleted) {
    console.log('adding deleted_at to project');
    await c.query(`ALTER TABLE "${schema}".project ADD COLUMN deleted_at TIMESTAMPTZ`);
    console.log('added');
  }
  // Check wbs_budget deleted_at
  const wbsCols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='wbs_budget'`, [schema]);
  console.log('wbs_budget has deleted_at?', wbsCols.rows.some(r=>r.column_name==='deleted_at'));
  // Also check live_expense, etc.
  const tables = ['project','wbs_budget','live_expense','wbs_category'];
  for (const t of tables) {
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`, [schema, t]);
    console.log(t, cols.rows.map(r=>r.column_name).join(',').slice(0,120));
  }
  await c.end();
}).catch(e=>{console.error(e);});
