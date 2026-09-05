import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path:'backend/.env'});
const {Client}=pg;
const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
for(const schema of ['solution_energy','saencrystal_global_services']){
  const tables=await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema=$1 AND table_name IN ('conversation','conversation_member','message','notifications') ORDER BY table_name`, [schema]);
  console.log(schema, tables.rows.map(r=>r.table_name));
  const tenantId = schema==='solution_energy'?'28c5e8aa-5270-4299-b062-2414575019b9':'e5b8e754-396c-48ed-b6f0-65578a32deea';
  const users=await c.query(`SELECT id, email, tenant_id FROM public."user" WHERE tenant_id=$1 LIMIT 5`, [tenantId]);
  console.log(' users', users.rows);
  try{
    const notif = await c.query(`SELECT * FROM "${schema}".notifications LIMIT 1`);
    console.log(' notifications sample', notif.rows);
  }catch(e){ console.log(' notifications error', e.message.slice(0,200));}
}
await c.end();
