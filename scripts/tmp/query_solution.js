const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const envContent = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env', 'utf8');
const line = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
let url = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const tenants = await c.query('SELECT tenant_id, name, schema_name, is_active FROM public.tenants ORDER BY name');
  console.log('tenants:', JSON.stringify(tenants.rows, null, 2));
  const sol = tenants.rows.find(t => t.name.toUpperCase().includes('SOLUTION'));
  if (!sol) { console.log('no SOLUTION tenant found'); await c.end(); return; }
  console.log('SOLUTION tenant:', sol);
  // try to query projects in tenant schema
  const schema = sol.schema_name;
  try {
    const projects = await c.query(`SELECT id, name, tenant_id FROM "${schema}".project LIMIT 5`);
    console.log(`projects in ${schema}:`, projects.rows);
  } catch (e) { console.error('project query error', e.message); }
  try {
    const live = await c.query(`SELECT id, project_id, description, amount FROM "${schema}".live_expense LIMIT 5`);
    console.log(`live_expense in ${schema}:`, live.rows);
  } catch (e) { console.error('live_expense error', e.message); }
  try {
    const wbs = await c.query(`SELECT id, project_id, code, description FROM "${schema}".wbs_budget LIMIT 5`);
    console.log(`wbs_budget in ${schema}:`, wbs.rows);
  } catch (e) { console.error('wbs_budget error', e.message); }
  // also check saencrystal's tenant
  const saen = await c.query('SELECT tenant_id FROM public."user" WHERE email=$1', ['saencrystal@gmail.com']);
  console.log('saen tenant_id', saen.rows[0]);
  await c.end();
}).catch(e => { console.error(e); });
