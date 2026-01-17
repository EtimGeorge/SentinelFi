import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import { TenantMigrationService } from "../database/tenant-migration.service"; // NEW

@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);
  // private readonly tenantSchemaTemplatePath = path.resolve(__dirname, '../../database/tenant-schema-template.sql'); // REMOVED

  constructor(
    private dataSource: DataSource,
    private tenantMigrationService: TenantMigrationService, // NEW
  ) {}

  /**
   * Provisions a new tenant schema by creating it and populating it with
   * tables and types via TypeORM migrations.
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

      // 2. Run TypeORM migrations on the new schema
      await this.tenantMigrationService.runTenantMigrations(schemaName);
      this.logger.log(
        `TypeORM migrations successfully applied to schema: "${schemaName}".`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to provision schema "${schemaName}": ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `An unknown error occurred while provisioning schema "${schemaName}"`,
          error,
        );
      }
      // It's crucial to clean up the partially created schema if an error occurs
      try {
        await queryRunner.query(
          `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
        );
        this.logger.warn(
          `Cleaned up partially created schema "${schemaName}" due to an error.`,
        );
      } catch (cleanupError) {
        if (cleanupError instanceof Error) {
          this.logger.error(
            `Failed to clean up schema "${schemaName}" after provisioning error: ${cleanupError.message}`,
            cleanupError.stack,
          );
        } else {
          this.logger.error(
            `An unknown error occurred during schema cleanup for "${schemaName}"`,
            cleanupError,
          );
        }
      }
      throw new InternalServerErrorException(
        `Failed to provision tenant schema "${schemaName}".`,
      );
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
        this.logger.error(
          `Failed to drop schema "${schemaName}": ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `An unknown error occurred while dropping schema "${schemaName}"`,
          error,
        );
      }
      throw new InternalServerErrorException(
        `Failed to drop tenant schema "${schemaName}".`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
