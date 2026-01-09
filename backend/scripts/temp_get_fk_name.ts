import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function getForeignKeyName() {
  dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in your environment variables.');
    process.exit(1);
  }

  const appClient = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
    await appClient.connect();
    console.log(`Successfully connected to database.`);

    const query = `
      SELECT
          tc.constraint_name
      FROM
          information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE
          tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'user' AND kcu.column_name = 'tenant_id' AND ccu.table_name = 'tenants';
    `;
    console.log("Executing query to find foreign key name...");
    const res = await appClient.query(query);
    console.log('Query Result:', res.rows);

    await appClient.end();
    console.log('Disconnected from database.');

  } catch (error) {
    console.error('Error getting foreign key name:', error);
    process.exit(1);
  } finally {
    if (appClient) {
      await appClient.end();
    }
  }
}

getForeignKeyName();
