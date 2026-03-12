import 'reflect-metadata'; // Must be imported first
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { exec, execSync } from 'child_process'; // Import exec
import { promisify } from 'util'; // Import promisify

const execPromise = promisify(exec); // Create a promisified version of exec

async function dbReset() {
  // Load environment variables dynamically, prioritizing .env.local over .env for the backend context
  dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in your environment variables.');
    process.exit(1);
  }

  // Extract connection details from DATABASE_URL
  const url = new URL(databaseUrl);
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port;
  const dbName = url.pathname.substring(1); // Remove leading slash

  let adminClient: Client | undefined; // Declare as undefined to handle potential failed initialization
  let appClient: Client | undefined; // Declare as undefined

  try {
    adminClient = new Client({ // Initialize inside try
      user,
      password,
      host,
      port: parseInt(port),
      database: 'postgres', // Connect to default admin database
      ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    });

    await adminClient.connect();
    console.log('Successfully connected to the "postgres" admin database.');

    // Drop database
    console.log(`Dropping database "${dbName}"...`);
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`);
    console.log(`Database "${dbName}" dropped.`);

    // Create database
    console.log(`Creating database "${dbName}"...`);
    await adminClient.query(`CREATE DATABASE "${dbName}";`);
    console.log(`Database "${dbName}" created.`);

    await adminClient.end();
    console.log('Disconnected from "postgres" admin database.');

    appClient = new Client({ // Initialize inside try
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    });

    // Now connect to the newly created database to run init.sql and migrations
    await appClient.connect();
    console.log(`Successfully connected to database "${dbName}".`);

    // Run init.sql
    const initSqlFilePath = path.resolve(__dirname, '../src/database/init.sql');
    const initSql = fs.readFileSync(initSqlFilePath, 'utf8');
    console.log(`Executing init.sql from ${initSqlFilePath}...`);
    await appClient.query(initSql);
    console.log('init.sql executed successfully.');

    await appClient.end();
    console.log('Disconnected from app database.');

    // Run TypeORM public migrations using npm script
    console.log('Running TypeORM public migrations...');
    try {
        execSync('npm run typeorm:run', {
            cwd: path.resolve(__dirname, '../../'),
            stdio: 'inherit', // Stream output directly to console
        });
        console.log('TypeORM public migrations executed successfully.');
    } catch (error) {
        console.error('Error during TypeORM public migrations:', error);
        throw error;
    }

    // Seed roles and permissions
    console.log('Seeding roles and permissions...');
    try {
        execSync('npx ts-node -r tsconfig-paths/register --project backend/tsconfig.json backend/src/database/seeds/seed-roles-permissions.ts', { 
            cwd: path.resolve(__dirname, '../../'),
            stdio: 'inherit', // Stream output directly to console
        });
        console.log('Roles and permissions seeded successfully.');
    } catch (error) {
        console.error('Error during roles and permissions seeding:', error);
        throw error;
    }


    // Run setup-test-tenants script to provision test tenants and their schemas
    console.log('Running setup-test-tenants script...');
    try {
        execSync('npx ts-node -r tsconfig-paths/register --project backend/tsconfig.json backend/scripts/setup-test-tenants.ts', {
            cwd: path.resolve(__dirname, '../../'),
            stdio: 'inherit', // Stream output directly to console
        });
        console.log('Test tenants and their schemas provisioned successfully.');
    } catch (error) {
        console.error('Error during test tenant provisioning:', error);
        throw error;
    }

  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  } finally {
    if (adminClient) {
      await adminClient.end();
    }
    if (appClient) {
      await appClient.end();
    }
  }
}

dbReset();
