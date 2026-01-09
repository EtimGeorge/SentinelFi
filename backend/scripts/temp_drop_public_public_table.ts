import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function dropPublicPublicTable() {
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

    const tableName = 'public'; // The table named 'public' in the 'public' schema

    console.log(`Dropping table "public"."${tableName}" if it exists...`);
    await appClient.query(`DROP TABLE IF EXISTS "public"."${tableName}";`);
    console.log(`Table "public"."${tableName}" dropped successfully.`);

    await appClient.end();
    console.log('Disconnected from database.');

  } catch (error) {
    console.error('Error dropping public.public table:', error);
    process.exit(1);
  } finally {
    if (appClient) {
      await appClient.end();
    }
  }
}

dropPublicPublicTable();
