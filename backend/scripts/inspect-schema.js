const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function inspect() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const schema = 'saencrystal_global_services';
    console.log(`\nChecking columns for table 'project' in schema '${schema}'...`);
    
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = 'project'
      ORDER BY column_name
    `, [schema]);
    
    console.table(res.rows);

    const clientsRes = await client.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = 'clients'
    `, [schema]);
    console.log(`Table 'clients' EXISTS: ${clientsRes.rows.length > 0}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspect();


// run this command to check the schema
// node inspect-schema.js 
// node backend/scripts/inspect-schema.js
