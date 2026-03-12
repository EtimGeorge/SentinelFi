const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('tenant_settings', 'p2p_requisition')
  `);
  console.log("Found tables:", res.rows.map(r => r.table_name));

  const cols = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'p2p_requisition'
  `);
  console.log("P2P req columns:", cols.rows.map(r => r.column_name).join(', '));
  
  await client.end();
}
check().catch(console.error);
