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
  path.resolve(envDir, 'backend', '.env.local'),
  path.resolve(envDir, '.env'),
  path.resolve(envDir, 'backend', '.env'),
];

// Check for system-level DATABASE_URL override before loading .env
const originalDbUrl = process.env.DATABASE_URL;

dotenv.config({ path: possibleEnvPaths });

const dbUrl = process.env.DATABASE_URL;

// Debugging: Redact password from DB_URL before logging
const logRedactedUrl = (url: string | undefined) => {
  if (!url) return 'undefined';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:****@${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch (e) {
    return 'invalid-url-format';
  }
};

if (originalDbUrl && originalDbUrl !== dbUrl) {
  console.warn(`[TypeORM] WARNING: System-level DATABASE_URL (${logRedactedUrl(originalDbUrl)}) was present but overridden by .env file.`);
}

console.log(`[TypeORM] Using DATABASE_URL: ${logRedactedUrl(dbUrl)}`);

if (!dbUrl) {
  console.error('[TypeORM] ERROR: DATABASE_URL is not defined. Check your .env or .env.local files.');
}

const config: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false }, // Neon requires SSL even in dev, but allow self-signed for flexibility
  schema: 'public', // Default schema for this DataSource, where public entities and migrations reside
  entities: [
    path.resolve(process.cwd(), process.cwd().endsWith('backend') ? 'src' : 'backend/src', '**/*.entity.ts'),
  ],
  migrations: [
    path.resolve(process.cwd(), process.cwd().endsWith('backend') ? 'src' : 'backend/src', 'migrations/public/*.ts'),
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