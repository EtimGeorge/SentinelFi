import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv'; // Import the config function

// Debugging dotenv loading
const envPath = path.resolve(__dirname, '../../backend/.env.local');
console.log(`[DEBUG DotEnv] Attempting to load .env from: ${envPath}`);
const dotenvResult = config({ path: envPath });

if (dotenvResult.error) {
  console.error(`[DEBUG DotEnv] Error loading .env file: ${dotenvResult.error}`);
} else if (dotenvResult.parsed) {
  console.log(`[DEBUG DotEnv] .env file loaded successfully. Keys loaded: ${Object.keys(dotenvResult.parsed).join(', ')}`);
} else {
  console.log(`[DEBUG DotEnv] .env file processed, but no variables parsed (might be empty or missing).`);
}


const run = async () => {
  const configService = new ConfigService();
  const databaseUrl = configService.get<string>('DATABASE_URL');
  console.log(`[DEBUG Script] DATABASE_URL retrieved by ConfigService: ${databaseUrl ? 'SET' : 'NOT SET'}`);
  const tenantSchema = process.argv[2]; // Get schema name from command line argument

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!tenantSchema) {
    throw new Error('Please provide a tenant schema name as a command line argument.');
  }

  // Manually create a DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: databaseUrl.includes('neon.tech'),
  });

  await dataSource.initialize();
  console.log('Database connection initialized.');

  const queryRunner = dataSource.createQueryRunner();

  try {
    // Read the tenant-schema.sql file
    const initSqlPath = path.resolve(__dirname, '../src/database/tenant-schema.sql');
    let initSql = fs.readFileSync(initSqlPath, 'utf8');

    console.log(`Setting search_path to "${tenantSchema}", public...`);
    await queryRunner.query(`SET search_path TO "${tenantSchema}", public;`);
    
    console.log('Executing init.sql for schema:', tenantSchema);
    await queryRunner.query(initSql);
    console.log('Successfully executed init.sql for schema:', tenantSchema);
  } catch (error) {
    console.error('Error executing SQL script:', error);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
    console.log('Database connection closed.');
  }
};

run().catch(console.error);
