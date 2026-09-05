const { Client } = require('D:/DOCUMENTS/Development/SentinelFi/node_modules/pg');
const fs = require('fs');
const env = fs.readFileSync('D:/DOCUMENTS/Development/SentinelFi/backend/.env','utf8').split('\n').find(l=>l.trim().startsWith('DATABASE_URL='));
let url = env.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g,'');
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const schema = 'solution_energy';
  const tenant_id = '28c5e8aa-5270-4299-b062-2414575019b9';
  try {
    const res = await c.query(`SELECT wbs.wbs_id, project.deleted_at FROM "${schema}".wbs_budget wbs LEFT JOIN "${schema}".project project ON project.project_id = wbs.project_id AND project.deleted_at IS NULL WHERE wbs.tenant_id=$1 LIMIT 1`, [tenant_id]);
    console.log('wbs query ok', res.rows.length);
  } catch(e) { console.log('wbs query error', e.message); }
  try {
    const res2 = await c.query(`SELECT DISTINCT "distinctAlias"."wbs_wbs_id" AS "ids" FROM (SELECT "wbs"."wbs_id" AS "wbs_wbs_id" FROM "${schema}".wbs_budget "wbs" LEFT JOIN "${schema}".project "project" ON "project"."project_id"="wbs"."project_id" AND "project"."deleted_at" IS NULL WHERE "wbs"."tenant_id"=$1 AND "wbs"."deleted_at" IS NULL ORDER BY "wbs"."wbs_code" ASC) "distinctAlias" LIMIT 1`, [tenant_id]);
    console.log('distinct query ok', res2.rows);
  } catch(e) { console.log('distinct error', e.message); }
  await c.end();
}).catch(e=>console.error(e));
