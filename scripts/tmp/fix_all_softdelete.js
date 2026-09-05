const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const tenants = await c.query('SELECT schema_name FROM public.tenants');
  const tables = ['wbs_category','project_inflow','lpo','project','wbs_budget','live_expense'];
  for (const {schema_name} of tenants.rows) {
    for (const t of tables) {
      const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`, [schema_name, t]);
      const has = cols.rows.some(r=>r.column_name==='deleted_at');
      if (!has) {
        console.log(`adding deleted_at to ${schema_name}.${t}`);
        await c.query(`ALTER TABLE "${schema_name}".${t} ADD COLUMN deleted_at TIMESTAMPTZ`);
        console.log(`added to ${schema_name}.${t}`);
      } else {
        console.log(`${schema_name}.${t} already has deleted_at`);
      }
    }
  }
  await c.end();
}).catch(e=>console.error(e));
