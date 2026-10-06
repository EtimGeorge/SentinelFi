// backend/scripts/run-tenant-migrations.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantMigrationService } from '../src/database/tenant-migration.service';
import { Logger } from '@nestjs/common';

/**
 * Usage:
 *   npx ts-node scripts/run-tenant-migrations.ts <schema>            run all pending
 *   npx ts-node scripts/run-tenant-migrations.ts <schema> --only A,B run a subset
 *   npx ts-node scripts/run-tenant-migrations.ts all                 every ACTIVE tenant
 *
 * `--only` exists because a single migration can be unrunnable for one tenant
 * while being runnable for another (e.g. a migration that ALTERs `payroll_run`
 * on a tenant that predates the payroll tables aborts the entire run and leaves
 * the other migrations unapplied). Skipped migrations stay pending and are
 * applied by a later run once the tenant has the base relations they need.
 */

function parseOnly(): string[] | undefined {
  const idx = process.argv.indexOf('--only');
  if (idx === -1) return undefined;
  const raw = process.argv[idx + 1];
  if (!raw) {
    throw new Error('--only requires a comma-separated list of migration class names.');
  }
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) {
    throw new Error('--only was provided but resolved to an empty list.');
  }
  return list;
}

async function activeTenantSchemas(): Promise<string[]> {
  const { Client } = await import('pg');
  const url = (process.env.DATABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
  if (!url) throw new Error('DATABASE_URL is not set.');
  const client = new Client({
    connectionString: url,
    ssl: url.includes('neon.tech') && !url.includes('sslmode=')
      ? { rejectUnauthorized: false }
      : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT schema_name FROM public.tenants
        WHERE is_active = true ORDER BY schema_name`,
    );
    return rows.map((r) => r.schema_name);
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  const logger = new Logger('RunTenantMigrationsScript');
  const schemaName = process.argv[2];

  if (!schemaName) {
    logger.error('Usage: run-tenant-migrations <schema|all> [--only MigrationA,MigrationB]');
    process.exit(1);
  }

  let only: string[] | undefined;
  try {
    only = parseOnly();
  } catch (e) {
    logger.error((e as Error).message);
    process.exit(1);
  }

  // We need to create a NestJS application context to access the DI container
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'], // Use a simple logger for the script
  });

  const tenantMigrationService = app.get(TenantMigrationService);

  const targets = schemaName === 'all' ? await activeTenantSchemas() : [schemaName];
  if (targets.length === 0) {
    logger.error('No ACTIVE tenants found.');
    await app.close();
    process.exit(1);
  }

  const failures: string[] = [];

  try {
    for (const schema of targets) {
      logger.log(`Starting migration run for schema: ${schema}`);
      try {
        await tenantMigrationService.runTenantMigrations(schema, only);
        logger.log(`Successfully completed migrations for schema: ${schema}`);
      } catch (error) {
        // Keep going: one tenant failing must not abort the other tenants.
        failures.push(schema);
        logger.error(`Error running migrations for schema ${schema}:`, error);
      }
    }
  } finally {
    await app.close();
  }

  if (failures.length > 0) {
    logger.error(`FAILED schemas: ${failures.join(', ')}`);
    process.exit(1);
  }
  logger.log(`All requested schemas completed: ${targets.join(', ')}`);
  process.exit(0);
}

bootstrap();
