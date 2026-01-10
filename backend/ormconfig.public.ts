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
  schema: 'public', // This DataSource is specifically for the public schema
  entities: [
    path.resolve(__dirname, 'src/tenants/tenant.entity.ts'),
    path.resolve(__dirname, 'src/auth/user.entity.ts'),
    path.resolve(__dirname, 'src/audit/audit.entity.ts'),
  ],
  migrations: [
    path.resolve(__dirname, 'src/migrations/public/*.ts'), // Public schema migrations
  ],
  migrationsTableName: 'public_migrations', // Dedicated migrations table for public schema
  synchronize: false, // Should always be false for production
  logging: true,
};

const AppDataSource = new DataSource(config);

export default AppDataSource;
