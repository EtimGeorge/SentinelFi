const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const envContent = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env', 'utf8');
const line = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
let url = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
console.log('url len', url.length);
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(() => c.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%user%'")).then(r => {
  console.log(JSON.stringify(r.rows, null, 2));
  return c.query('SELECT id, email, is_active, tenant_id, password_hash FROM public."user" WHERE email = $1', ['saencrystal@gmail.com']);
}).then(r => {
  console.log("users rows:", JSON.stringify(r.rows, null, 2));
  return c.query('SELECT * FROM public."user" LIMIT 3');
}).then(r => {
  console.log("sample users:", r.rows.map(u => ({email:u.email, is_active:u.is_active, tenant_id:u.tenant_id})));
  return c.end();
}).catch(e => { console.error(e.message); console.error(e.stack); c.end(); });
