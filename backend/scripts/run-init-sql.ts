import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

async function runInitSql() {
  // Load environment variables dynamically, prioritizing .env.local over .env for the backend context
  dotenv.config({ path: [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '.env')] });

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in your environment variables.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false, // Neon requires SSL
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database.');

    const sqlFilePath = path.resolve(__dirname, '../../database/init.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`Executing SQL from ${sqlFilePath}...`);
    await client.query(sql);
    console.log('init.sql executed successfully.');

  } catch (error) {
    console.error('Error executing init.sql:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

runInitSql();
