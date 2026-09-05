const { DataSource } = require('typeorm');
require('dotenv').config({path: 'D:/DOCUMENTS/Development/SentinelFi/backend/.env'});
let url = process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, '').replace('postgresql://','postgres://');
(async()=>{
  const ds = new DataSource({type:'postgres', url, ssl:{rejectUnauthorized:false}});
  await ds.initialize();
  const users = await ds.query(`SELECT id, email, tenant_id, roles FROM public."user"`);
  console.log(JSON.stringify(users, null,2));
  // also check tenant schemas for wbs_template existence via pg
  const t1 = await ds.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='solution_energy' AND table_name='wbs_template'`);
  const t2 = await ds.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='saencrystal_global_services' AND table_name='wbs_template'`);
  console.log('wbs_template in solution_energy',t1.length,'saencrystal',t2.length);
  await ds.destroy();
})();
