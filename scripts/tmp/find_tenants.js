const { DataSource } = require('typeorm');
require('dotenv').config({path: 'D:/DOCUMENTS/Development/SentinelFi/backend/.env'});
let url = process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, '').replace('postgresql://','postgres://');
(async()=>{
  const ds = new DataSource({type:'postgres', url, ssl:{rejectUnauthorized:false}});
  await ds.initialize();
  const tenants = await ds.query(`SELECT tenant_id, name, schema_name FROM public.tenants`);
  console.log(tenants);
  const schemas = await ds.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY schema_name`);
  console.log('schemas', schemas.map(s=>s.schema_name));
  await ds.destroy();
})();
