const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function testConn() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not found in backend/.env');
    process.exit(1);
  }
  console.log('Testing connection to:', url.split('@')[1]);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL');
    const res = await client.query('SELECT current_schema(), version()');
    console.log('✓ Query successful:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
    process.exit(1);
  }
}

testConn();
