const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function listTables() {
  const client = new Client({ connectionString });
  let log = '';
  
  try {
    await client.connect();
    log += 'Connected to DB\n';

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    log += `\n--- TABLES IN PUBLIC ---\n`;
    log += res.rows.map(r => r.table_name).join(', ') + '\n';

  } catch(e) {
    log += 'Error: ' + e.message + '\n';
  } finally {
    client.end();
    fs.writeFileSync('tables-audit.txt', log);
  }
}

listTables();
