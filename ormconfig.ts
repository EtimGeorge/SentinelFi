import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables dynamically, prioritizing .env.local over .env for the backend context
dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

const config: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use DATABASE_URL from .env files
  ssl: process.env.DATABASE_URL?.includes('neon.tech'), // Conditionally enable SSL for Neon databases
  schema: 'public', // Default schema for this DataSource, where public entities and migrations reside
  entities: [
    './backend/src/**/*.entity{.ts,.js}', // Discover all entities within backend/src
  ],
  migrations: [
    './backend/src/migrations/**/*.ts', // Discover all migrations in both public and client_template folders
  ],
  migrationsTableName: 'public.migrations', // Explicitly specify where TypeORM's migration table is
  synchronize: false, // Should always be false for production
  logging: true,
  // For migration generation (optional, can be configured via CLI if needed)
  // But explicitly setting for consistency.
  // cli: {
  //   migrationsDir: 'backend/src/migrations',
  // },
  // outputAsTs: true, // Generate migrations as TypeScript
};

const AppDataSource = new DataSource(config);

export default AppDataSource;