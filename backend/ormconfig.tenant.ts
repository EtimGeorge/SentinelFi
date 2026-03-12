import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables dynamically, prioritizing .env.local over .env for the backend context
dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

const config: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use DATABASE_URL from .env files
  ssl: process.env.DATABASE_URL?.includes('neon.tech'), // Conditionally enable SSL for Neon databases
  schema: 'solution_energy', // Target a valid tenant schema for migrations
  entities: [
    path.resolve(__dirname, 'src/**/*.entity.ts'),
  ],
  migrations: [
    path.resolve(__dirname, 'src/migrations/tenant/*.ts'), // Tenant schema migrations
  ],
  migrationsTableName: 'tenant_migrations', // Dedicated migrations table for tenant schemas
  synchronize: false, // Should always be false for production
  logging: true,
};

const AppDataSource = new DataSource(config);

export default AppDataSource;
