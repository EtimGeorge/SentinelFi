const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const envContent = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env', 'utf8');
const line = envContent.split('\n').find(l => l.trim().startsWith('DATABASE_URL='));
let url = line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const schema = 'solution_energy';
  const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name='project' ORDER BY ordinal_position`, [schema]);
  console.log('project columns', cols.rows);
  const cols2 = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='wbs_budget' ORDER BY ordinal_position`, [schema]);
  console.log('wbs_budget columns', cols2.rows);
  const projects = await c.query(`SELECT * FROM "${schema}".project LIMIT 2`);
  console.log('projects sample', projects.rows.map(r => Object.keys(r)));
  console.log(projects.rows[0]);
  const users = await c.query('SELECT email, tenant_id FROM public."user" WHERE tenant_id=$1', ['28c5e8aa-5270-4299-b062-2414575019b9']);
  console.log('users in SOLUTION_ENERGY', users.rows);
  await c.end();
}).catch(e => console.error(e));
