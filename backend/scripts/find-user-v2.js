const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function findUser() {
  const client = new Client({ connectionString });
  let log = '';
  
  try {
    await client.connect();
    log += 'Connected to DB\n';

    // Get users and their tenant IDs
    const uRes = await client.query('SELECT id, email, tenant_id FROM public."user" LIMIT 10');
    log += `\n--- USERS ---\n`;
    log += JSON.stringify(uRes.rows, null, 2) + '\n';

    // Get tenants info
    const tRes = await client.query("SELECT tenant_id, name, schema_name FROM public.tenants");
    log += `\n--- ALL TENANTS ---\n`;
    log += JSON.stringify(tRes.rows, null, 2) + '\n';

  } catch(e) {
    log += 'Error: ' + e.message + '\n';
  } finally {
    client.end();
    fs.writeFileSync('user-audit-v2.txt', log);
  }
}

findUser();
