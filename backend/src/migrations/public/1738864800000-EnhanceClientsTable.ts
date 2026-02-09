import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to enhance clients table with soft delete and unique constraints
 * 
 * Changes:
 * 1. Add deleted_at column for soft delete functionality
 * 2. Add unique partial index on (tenant_id, name) excluding soft-deleted records
 * 3. Add performance index on tenant_id for faster tenant-scoped queries
 */
export class EnhanceClientsTable1738864800000 implements MigrationInterface {
  name = 'EnhanceClientsTable1738864800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at column for soft delete
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN "deleted_at" TIMESTAMP NULL
      COMMENT 'Soft delete timestamp for audit trail'
    `);

    // Add unique constraint on (tenant_id, name) excluding soft-deleted records
    // This allows the same client name to be  reused after soft delete
    await queryRunner.query(`
      CREATE UNIQUE INDEX "unique_client_name_per_tenant"
      ON "clients" ("tenant_id", "name")
      WHERE "deleted_at" IS NULL
    `);

    // Add performance  index on tenant_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX "idx_clients_tenant_id"
      ON "clients" ("tenant_id")
    `);

    console.log('✅ Enhanced clients table with soft delete and unique constraints');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_clients_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "unique_client_name_per_tenant"`);
    
    // Remove deleted_at column
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "deleted_at"`);

    console.log('✅ Reverted clients table enhancements');
  }
}
