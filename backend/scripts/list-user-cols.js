const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function listCols() {
  const client = new Client({ connectionString });
  let log = '';
  
  try {
    await client.connect();
    log += 'Connected to DB\n';

    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user' AND table_schema = 'public'");
    log += `\n--- COLUMNS IN public."user" ---\n`;
    log += res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', ') + '\n';

  } catch(e) {
    log += 'Error: ' + e.message + '\n';
  } finally {
    client.end();
    fs.writeFileSync('user-cols.txt', log);
  }
}

listCols();
