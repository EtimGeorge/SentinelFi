import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

async function dbReset() {
  // Load environment variables dynamically, prioritizing .env.local over .env for the backend context
  dotenv.config({ path: [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '.env')] });

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

  // Connection to the 'postgres' administrative database to drop/create neondb
  const adminClient = new Client({
    user,
    password,
    host,
    port: parseInt(port),
    database: 'postgres', // Connect to default admin database
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  const appClient = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
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

    // Now connect to the newly created database to run init.sql and migrations
    await appClient.connect();
    console.log(`Successfully connected to database "${dbName}".`);

    // Run init.sql
    const initSqlFilePath = path.resolve(__dirname, '../../database/init.sql');
    const initSql = fs.readFileSync(initSqlFilePath, 'utf8');
    console.log(`Executing init.sql from ${initSqlFilePath}...`);
    await appClient.query(initSql);
    console.log('init.sql executed successfully.');

    await appClient.end();
    console.log('Disconnected from app database.');

    // Run TypeORM migrations using npm script
    console.log('Running TypeORM migrations...');
    execSync('npm run typeorm:run', { stdio: 'inherit', cwd: path.resolve(__dirname, '../../') });
    console.log('TypeORM migrations executed successfully.');

  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  } finally {
    if (adminClient._connected) {
      await adminClient.end();
    }
    if (appClient._connected) {
      await appClient.end();
    }
  }
}

dbReset();
