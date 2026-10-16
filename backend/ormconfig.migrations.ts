import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Minimal ormconfig for running migrations only. No entities loaded,
// so @shared/types path alias resolution is not needed.
const envDir = process.cwd();
const possibleEnvPaths = [
  path.resolve(envDir, '.env.local'),
  path.resolve(envDir, 'backend', '.env.local'),
  path.resolve(envDir, '.env'),
  path.resolve(envDir, 'backend', '.env'),
];
dotenv.config({ path: possibleEnvPaths });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('[TypeORM] ERROR: DATABASE_URL is not defined.');
  process.exit(1);
}

console.log('[TypeORM] Running migrations (entities not loaded)');

const config: DataSourceOptions = {
  type: 'postgres',
  url: dbUrl,
  ssl: { rejectUnauthorized: false },
  schema: 'public',
  // No entities - migration:run doesn't need them
  entities: [],
  migrations: [
    path.resolve(__dirname, 'src/migrations/public/*.ts'),
  ],
  migrationsTableName: 'public_migrations',
  synchronize: false,
  logging: true,
};

export default new DataSource(config);