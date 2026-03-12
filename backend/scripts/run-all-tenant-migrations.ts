import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantMigrationService } from '../src/database/tenant-migration.service';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Script to automatically discover all tenants in the public "tenant" table
 * and run all pending tenant migrations for their respective schemas.
 */
async function bootstrap() {
  const logger = new Logger('MigrateAllTenants');
  logger.log('Bootstrapping application context for global migration...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const tenantMigrationService = app.get(TenantMigrationService);
  const dataSource = app.get(DataSource); // The default public payload database connection

  try {
    logger.log('Fetching all active tenants from public schema...');
    
    // Use TypeORM Repository to avoid raw schema/table name issues
    const tenantRepo = dataSource.getRepository('TenantEntity');
    const tenants = await tenantRepo.find({
      where: { is_active: true },
      select: ['name', 'schema_name']
    });

    if (!tenants || tenants.length === 0) {
      logger.warn('No active tenants found in the database.');
    } else {
      logger.log(`Found ${tenants.length} active tenant(s). Beginning migrations...`);
      
      let successCount = 0;
      let failureCount = 0;

      for (const tenant of tenants) {
        const schema = tenant.schema_name;
        logger.log(`\n========================================`);
        logger.log(`🚀 Migrating Tenant: [${tenant.name}] (Schema: ${schema})`);
        logger.log(`========================================`);
        
        try {
          await tenantMigrationService.runTenantMigrations(schema);
          successCount++;
        } catch (err) {
          logger.error(`❌ Failed migrating tenant [${tenant.name}] (Schema: ${schema}):`, err);
          failureCount++;
          // We continue to the next tenant even if one fails
        }
      }

      logger.log(`\n================= SUMMARY =================`);
      logger.log(`Total Tenants Processed: ${tenants.length}`);
      logger.log(`Successful: ${successCount}`);
      logger.log(`Failed: ${failureCount}`);
      logger.log(`===========================================`);
      
      if (failureCount > 0) {
        logger.warn('⚠️ Completed with some failures. Check logs above.');
        process.exit(1);
      } else {
        logger.log('✅ All tenant schemas are synchronized completely!');
      }
    }
  } catch (error) {
    logger.error('Fatal error executing global migration script:', error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
