import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);
  private readonly tenantSchemaTemplatePath = path.resolve(__dirname, '../../database/tenant-schema-template.sql');

  constructor(private dataSource: DataSource) {}

  /**
   * Provisions a new tenant schema by creating it and populating it with
   * tables and types defined in the tenant-schema-template.sql.
   * @param schemaName The name of the new schema to provision.
   */
  async provisionTenantSchema(schemaName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log(`Starting provisioning for schema: "${schemaName}"`);

      // 1. Create the schema
      await queryRunner.query(`CREATE SCHEMA "${schemaName}"`);
      this.logger.log(`Schema "${schemaName}" created.`);

      // 2. Read and execute the tenant schema template SQL
      let templateSql = fs.readFileSync(this.tenantSchemaTemplatePath, 'utf8');

      // Replace placeholders in the SQL template
      // {schema_name} for schema prefixing (e.g., "tenant_xyz"."table")
      // {schema_name_short} for unique constraint names (e.g., "UQ_tablename_tenant_xyz")
      const schemaNameShort = schemaName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10); // Simple sanitization/shortening
      
      templateSql = templateSql.replace(/{schema_name}/g, `"${schemaName}"`);
      templateSql = templateSql.replace(/{schema_name_short}/g, schemaNameShort);


      // Execute the templated SQL
      // Split by semicolon and filter out empty strings
      const sqlStatements = templateSql.split(';').filter(s => s.trim().length > 0);

      for (const sql of sqlStatements) {
        // Only execute non-empty statements
        if (sql.trim().length > 0) {
          await queryRunner.query(sql);
        }
      }
      this.logger.log(`Tenant schema "${schemaName}" populated with tables and types.`);

    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to provision schema "${schemaName}": ${error.message}`, error.stack);
      } else {
        this.logger.error(`An unknown error occurred while provisioning schema "${schemaName}"`, error);
      }
      // It's crucial to clean up the partially created schema if an error occurs
      try {
        await queryRunner.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        this.logger.warn(`Cleaned up partially created schema "${schemaName}" due to an error.`);
      } catch (cleanupError) {
        if (cleanupError instanceof Error) {
          this.logger.error(`Failed to clean up schema "${schemaName}" after provisioning error: ${cleanupError.message}`, cleanupError.stack);
        } else {
          this.logger.error(`An unknown error occurred during schema cleanup for "${schemaName}"`, cleanupError);
        }
      }
      throw new InternalServerErrorException(`Failed to provision tenant schema "${schemaName}".`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Drops a tenant schema.
   * @param schemaName The name of the schema to drop.
   */
  async dropTenantSchema(schemaName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      this.logger.log(`Attempting to drop schema: "${schemaName}"`);
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      this.logger.log(`Schema "${schemaName}" dropped successfully.`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to drop schema "${schemaName}": ${error.message}`, error.stack);
      } else {
        this.logger.error(`An unknown error occurred while dropping schema "${schemaName}"`, error);
      }
      throw new InternalServerErrorException(`Failed to drop tenant schema "${schemaName}".`);
    } finally {
      await queryRunner.release();
    }
  }
}
