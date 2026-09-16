import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Reservation-first provisioning support.
 *
 * Adds an explicit, queryable provisioning lifecycle to `public.tenants` so a
 * "zombie" tenant (row live, schema missing or half-migrated) is no longer
 * invisible. Previously the only way to detect one was to attempt a login and
 * read the 500.
 *
 * THE BACKFILL IS THE CRITICAL PART. Every tenant that already exists was
 * created by the legacy flow, which only returned successfully AFTER migrations
 * had been applied — so they are ACTIVE by definition. Skipping this backfill
 * would leave every existing customer as PENDING, and the auth guard's
 * fail-closed provisioning check would lock out the entire production customer
 * base the moment this deploys.
 */
export class AddTenantProvisioningStatus1777000000002
  implements MigrationInterface
{
  name = "AddTenantProvisioningStatus1777000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "provisioning_status" character varying(20) NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "provisioning_error" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "provisioning_started_at" TIMESTAMP WITH TIME ZONE`,
    );

    // Live rows: legacy provisioning only completed once migrations ran.
    await queryRunner.query(
      `UPDATE "public"."tenants"
          SET "provisioning_status" = 'ACTIVE'
        WHERE "provisioning_status" = 'PENDING'
          AND "deleted_at" IS NULL`,
    );

    // Soft-deleted rows are terminal — never mark them usable.
    await queryRunner.query(
      `UPDATE "public"."tenants"
          SET "provisioning_status" = 'FAILED',
              "provisioning_error" = 'Soft-deleted before provisioning status tracking was introduced.'
        WHERE "provisioning_status" = 'PENDING'
          AND "deleted_at" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_provisioning_status" ON "public"."tenants" ("provisioning_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_tenants_provisioning_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" DROP COLUMN IF EXISTS "provisioning_started_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" DROP COLUMN IF EXISTS "provisioning_error"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."tenants" DROP COLUMN IF EXISTS "provisioning_status"`,
    );
  }
}
