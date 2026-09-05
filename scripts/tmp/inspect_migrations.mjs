import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path:'backend/.env'});
const {Client}=pg;
const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
for(const schema of ['solution_energy','saencrystal_global_services']){
  const mig=await c.query(`SELECT name FROM "${schema}".tenant_migrations ORDER BY timestamp`);
  console.log(schema, mig.rows.map(r=>r.name));
  const conv=await c.query(`SELECT to_regclass('"${schema}".conversation')`);
  console.log(' conv exists', conv.rows);
}
await c.end();
