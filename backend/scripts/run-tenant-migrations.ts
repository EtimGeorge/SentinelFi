// backend/scripts/run-tenant-migrations.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantMigrationService } from '../src/database/tenant-migration.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('RunTenantMigrationsScript');
  const schemaName = process.argv[2];

  if (!schemaName) {
    logger.error('Please provide a schema name as an argument.');
    process.exit(1);
  }

  logger.log(`Starting migration run for schema: ${schemaName}`);

  // We need to create a NestJS application context to access the DI container
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'], // Use a simple logger for the script
  });

  const tenantMigrationService = app.get(TenantMigrationService);

  try {
    await tenantMigrationService.runTenantMigrations(schemaName);
    logger.log(`Successfully completed migrations for schema: ${schemaName}`);
  } catch (error) {
    logger.error(`Error running migrations for schema ${schemaName}:`, error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
