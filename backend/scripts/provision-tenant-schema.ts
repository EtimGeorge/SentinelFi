import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { glob } from 'glob';

// Load environment variables dynamically, prioritizing .env.local over .env for the backend context
dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

const provisionTenantSchema = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  const tenantSchema = process.argv[2]; // Get schema name from command line argument

  if (!databaseUrl) {
    console.error('DATABASE_URL is not defined in your environment variables.');
    process.exit(1);
  }

  if (!tenantSchema) {
    console.error('Please provide a tenant schema name as a command line argument (e.g., "npm run script -- tenant_schema_name").');
    process.exit(1);
  }

  console.log(`Attempting to provision schema: "${tenantSchema}"`);

  // 1. Connect to the database to create the schema itself
  const adminClient = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    schema: 'public', // Connect to public schema initially to create new tenant schema
  });

  try {
    await adminClient.initialize();
    await adminClient.query(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}";`);
    console.log(`Schema "${tenantSchema}" ensured to exist.`);
  } catch (error) {
    console.error(`Error creating schema "${tenantSchema}":`, error);
    await adminClient.destroy();
    process.exit(1);
  } finally {
    if (adminClient.isInitialized) {
      await adminClient.destroy();
    }
  }

  // 2. Configure a new DataSource instance specifically for the tenant schema
  // This DataSource will discover and apply only tenant-specific entities/migrations.

  // Dynamically find tenant-specific entities
  const tenantEntities = glob.sync(path.resolve(__dirname, '../src/**/*.{project,wbs-budget,operational-budget,live-expense,wbs-category}.entity{.ts,.js}'));
  // Dynamically find tenant-specific migrations (if any, structure to be defined)
  const tenantMigrations = glob.sync(path.resolve(__dirname, '../src/migrations/tenant/**/*.ts'));


  const tenantDataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    schema: tenantSchema, // IMPORTANT: Target the specific tenant schema
    entities: tenantEntities,
    migrations: tenantMigrations,
    migrationsTableName: 'migrations', // Each tenant schema will have its own migrations table
    synchronize: false, // Always false for production
    logging: true,
  });

  try {
    await tenantDataSource.initialize();
    console.log(`TypeORM DataSource initialized for tenant schema "${tenantSchema}".`);

    // Run migrations specifically for this tenant schema
    if (tenantMigrations.length > 0) {
      console.log(`Running TypeORM migrations for tenant schema "${tenantSchema}"...`);
      await tenantDataSource.runMigrations();
      console.log(`TypeORM migrations for tenant schema "${tenantSchema}" completed successfully.`);
    } else {
      // If no specific migrations, use synchronize for initial schema setup (development only)
      console.warn(`No specific migrations found for tenant schema "${tenantSchema}". Using schema synchronization.`);
      console.warn(`WARNING: synchronize: true is for development only. Use migrations in production.`);
      await tenantDataSource.synchronize(); // This will create tables based on entities
      console.log(`TypeORM schema synchronization for tenant schema "${tenantSchema}" completed successfully.`);
    }

  } catch (error) {
    console.error(`Error during TypeORM operations for tenant schema "${tenantSchema}":`, error);
    process.exit(1);
  } finally {
    if (tenantDataSource.isInitialized) {
      await tenantDataSource.destroy();
      console.log(`TypeORM DataSource for tenant schema "${tenantSchema}" destroyed.`);
    }
  }

  console.log(`Tenant schema "${tenantSchema}" provisioning completed.`);
};

provisionTenantSchema().catch(console.error);