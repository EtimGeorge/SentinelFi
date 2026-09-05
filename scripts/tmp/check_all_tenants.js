const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const tenants = await c.query('SELECT schema_name FROM public.tenants');
  console.log('tenants', tenants.rows.map(r=>r.schema_name));
  for (const {schema_name} of tenants.rows) {
    const tables = ['project','wbs_budget','live_expense','wbs_category','project_inflow','lpo'];
    for (const t of tables) {
      try {
        const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`, [schema_name, t]);
        const has = cols.rows.some(r=>r.column_name==='deleted_at');
        console.log(`${schema_name}.${t} has deleted_at? ${has} cols: ${cols.rows.map(r=>r.column_name).join(',').slice(0,120)}`);
      } catch(e){ console.log(`error ${schema_name}.${t}`, e.message); }
    }
  }
  await c.end();
}).catch(e=>console.error(e));
