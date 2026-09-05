const { Client } = require('pg');
require('dotenv').config({path:'backend/.env'});
const url=process.env.DATABASE_URL;
const c=new Client({connectionString:url, ssl:{rejectUnauthorized:false}});
(async()=>{
  await c.connect();
  // missing migrations for saencrystal
  const missing = [
    {ts: 1773005895696, name:'AddFulfillmentTrackingFields1773005895696'},
    {ts: 1773015288077, name:'AddProjectSoftDelete1773015288077'},
    {ts: 1773164796059, name:'AddReportingAndMessagingTables1773164796059'},
    {ts: 1774046551047, name:'AddSoftDeleteToOpexEntities1774046551047'},
  ];
  for(const m of missing){
    await c.query(`INSERT INTO "saencrystal_global_services"."tenant_migrations" ("timestamp","name") VALUES ($1,$2) ON CONFLICT DO NOTHING`,[m.ts, m.name]);
    console.log('inserted',m.name);
  }
  const res=await c.query('SELECT name FROM "saencrystal_global_services"."tenant_migrations" ORDER BY name');
  console.log(res.rows.map(r=>r.name).join(', '));
  await c.end();
})();
