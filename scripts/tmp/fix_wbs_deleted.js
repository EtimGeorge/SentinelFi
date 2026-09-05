const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const schema = 'saencrystal_global_services';
  const tables = ['wbs_budget','live_expense','wbs_category'];
  for (const t of tables) {
    const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`, [schema, t]);
    const has = cols.rows.some(r=>r.column_name==='deleted_at');
    console.log(t, 'has deleted_at?', has);
    if (!has) {
      console.log('adding to', t);
      // wbs_budget uses deleted_at as DeleteDateColumn, live_expense may not have it, but we add if missing
      try { await c.query(`ALTER TABLE "${schema}".${t} ADD COLUMN deleted_at TIMESTAMPTZ`); console.log('added to', t); } catch(e){console.log('add error', e.message);}
    }
  }
  await c.end();
}).catch(e=>console.error(e));
