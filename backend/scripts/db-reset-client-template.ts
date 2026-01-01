// backend/scripts/db-reset-client-template.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
// Prioritize .env.local, then .env
const envPathLocal = path.resolve(__dirname, '../../backend/.env.local');
const envPath = path.resolve(__dirname, '../../backend/.env');

if (fs.existsSync(envPathLocal)) {
  config({ path: envPathLocal });
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
    console.error('No .env.local or .env file found in backend directory.');
    process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
const CLIENT_TEMPLATE_SCHEMA = 'client_template'; // The schema to reset

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined in environment variables.');
  process.exit(1);
}

async function runDbReset() {
  console.log(`Starting database reset for schema: ${CLIENT_TEMPLATE_SCHEMA}`);

  // 1. Connect to the specified database (from DATABASE_URL) to perform schema operations
  const client = new Client({ connectionString: DATABASE_URL! });

  try {
    await client.connect();
    console.log('Connected to specified PostgreSQL database.');

    // --- NEW: Drop and Recreate Public Schema for a Full Reset ---
    console.log(`Dropping schema "public" if it exists...`);
    await client.query(`DROP SCHEMA IF EXISTS "public" CASCADE;`);
    console.log(`Schema "public" dropped.`);
    console.log(`Creating schema "public"...`);
    await client.query(`CREATE SCHEMA "public";`);
    console.log(`Schema "public" created.`);
    // --- END NEW ---

    // --- NEW: Ensure core extensions exist in public schema ---
    console.log('Ensuring uuid-ossp and pgcrypto extensions exist in public schema...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    console.log('UUID extensions ensured.');
    // --- END NEW ---

    // 2. Drop the client_template schema (moved after public reset)
    console.log(`Dropping schema "${CLIENT_TEMPLATE_SCHEMA}" if it exists...`);
    await client.query(`DROP SCHEMA IF EXISTS "${CLIENT_TEMPLATE_SCHEMA}" CASCADE;`);
    console.log(`Schema "${CLIENT_TEMPLATE_SCHEMA}" dropped.`);

    // 3. Create the client_template schema
    console.log(`Creating schema "${CLIENT_TEMPLATE_SCHEMA}"...`);
    await client.query(`CREATE SCHEMA "${CLIENT_TEMPLATE_SCHEMA}";`);
    console.log(`Schema "${CLIENT_TEMPLATE_SCHEMA}" created.`);

    // 4. Execute init.sql within the new schema (now that schemas are clean)
    const initSqlPath = path.resolve(__dirname, '../../database/init.sql');
    if (fs.existsSync(initSqlPath)) {
      console.log(`Executing init.sql from ${initSqlPath}...`);
      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      // Set search_path to ensure init.sql commands apply to the correct schema
      await client.query(`SET search_path TO "${CLIENT_TEMPLATE_SCHEMA}";`);
      await client.query(initSql);
      console.log('init.sql executed successfully.');
    } else {
      console.warn(`Warning: init.sql not found at ${initSqlPath}. Skipping.`);
    }

  } catch (error) {
    console.error('Error during schema drop/create or init.sql execution:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Disconnected from default PostgreSQL database.');
  }

  // 5. Run TypeORM Migrations for the client_template schema
  // This requires a TypeORM DataSource configured for the specific schema
  // Assuming ormconfig.ts is set up to use the DATABASE_URL and can be adapted for schema
  // For simplicity, we'll create a new DataSource instance here.
  // In a real multi-tenant setup, your ormconfig.ts might dynamically set the schema.
  const dataSource = new DataSource({
    type: 'postgres',
    url: DATABASE_URL,
    schema: 'public', // Migrations table is in public schema. We then set schema for entities.
    entities: [path.resolve(__dirname, '../../backend/**/*.entity{.ts,.js}')], // Adjust path as needed
    migrations: [
      path.resolve(__dirname, '../../backend/src/migrations/public/*.ts'),
      path.resolve(__dirname, '../../backend/src/migrations/client_template/*.ts'),
    ],
    synchronize: false, // Never use synchronize in production
    logging: ['query', 'error'],
  });

  try {
    await dataSource.initialize();
    console.log('TypeORM DataSource initialized for migrations.');

    console.log('Running TypeORM migrations...');
    await dataSource.runMigrations();
    console.log('TypeORM migrations completed successfully.');

  } catch (error) {
    console.error('Error during TypeORM migrations:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('TypeORM DataSource destroyed.');
    }
  }

  console.log(`Database reset for schema ${CLIENT_TEMPLATE_SCHEMA} completed.`);
}

runDbReset();
