import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { RoleEntity } from './src/auth/role.entity'; // Import RoleEntity
import { PermissionEntity } from './src/auth/permission.entity'; // Import PermissionEntity

// Load environment variables dynamically, searching in both the current directory and the 'backend' directory
// to support running from either the monorepo root or the backend folder.
const envDir = process.cwd();
const possibleEnvPaths = [
  path.resolve(envDir, '.env.local'),
  path.resolve(envDir, '.env'),
  path.resolve(envDir, 'backend', '.env.local'),
  path.resolve(envDir, 'backend', '.env'),
];
dotenv.config({ path: possibleEnvPaths });

// Also ensure NODE_ENV is set to development if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const config: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use DATABASE_URL from .env files
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false }, // Neon requires SSL even in dev, but allow self-signed for flexibility
  schema: 'public', // Default schema for this DataSource, where public entities and migrations reside
  entities: [
    path.resolve(process.cwd(), process.cwd().endsWith('backend') ? 'src' : 'backend/src', '**/*.entity.ts'),
  ],
  migrations: [
    path.resolve(process.cwd(), process.cwd().endsWith('backend') ? 'src/migrations/public' : 'backend/src/migrations/public', '*.ts'),
  ],
  migrationsTableName: 'public_migrations', // Aligned with ormconfig.public.ts
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