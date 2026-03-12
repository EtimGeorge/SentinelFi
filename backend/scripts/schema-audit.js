const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkSchemas() {
  const client = new Client({ connectionString });
  let log = '';
  
  try {
    await client.connect();
    log += 'Connected to DB\n';

    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'project'
    `);
    log += `\n--- SCHEMAS CONTAINING 'project' ---\n`;
    log += JSON.stringify(res.rows, null, 2) + '\n';

    const res2 = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'live_expense'
    `);
    log += `\n--- SCHEMAS CONTAINING 'live_expense' ---\n`;
    log += JSON.stringify(res2.rows, null, 2) + '\n';

  } catch(e) {
    log += 'Error: ' + e.message + '\n';
  } finally {
    client.end();
    fs.writeFileSync('schema-audit.txt', log);
  }
}

checkSchemas();
