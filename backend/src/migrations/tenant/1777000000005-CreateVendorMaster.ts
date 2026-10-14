import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Vendor master. Introduces a tenant-scoped `vendor` table and links P2P
 * requisitions, purchase orders and invoices to it via a nullable `vendor_id`
 * FK. The legacy denormalised `vendor_name` columns are retained as a display
 * snapshot and for backward compatibility; `vendor_id` is nullable so existing
 * free-text documents remain valid and are opt-in reconciled later.
 */
export class CreateVendorMaster1777000000005 implements MigrationInterface {
  name = "CreateVendorMaster1777000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // `pg_type` is a GLOBAL catalog: a bare `typname` probe matches the enum row
    // in EVERY schema, not just this tenant's, and ignores the search_path set
    // above. Scoping by namespace is what makes this guard per-tenant. Without
    // it the first tenant to run this migration convinces every later tenant
    // that the enum already exists, so they skip `CREATE TYPE` and then fail on
    // the missing type when creating the `vendor` table.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'vendor_status_enum'
            AND n.nspname = current_schema()
        ) THEN
          CREATE TYPE "vendor_status_enum" AS ENUM ('ACTIVE', 'INACTIVE');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "tax_id" character varying(100),
        "contact_name" character varying(255),
        "email" character varying(255),
        "phone" character varying(50),
        "address" text,
        "payment_terms_days" integer NOT NULL DEFAULT 30,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" "vendor_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vendor_tenant_code" ON "vendor" ("tenant_id", "code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_tenant_id" ON "vendor" ("tenant_id")`,
    );

    for (const table of [
      "p2p_requisition",
      "p2p_purchase_order",
      "p2p_invoice",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "vendor_id" uuid`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_${table}_vendor_id" ON "${table}" ("vendor_id")`,
      );
      // Same cross-schema trap as the enum guard above: `pg_constraint` is also a
      // global catalog, so an unscoped `conname` probe sees the FK in every other
      // tenant schema and reports "already exists". Scoping by namespace AND by
      // the constrained table keeps the check local to (this schema, this table).
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE c.conname = 'FK_${table}_vendor'
              AND n.nspname = current_schema()
              AND t.relname = '${table}'
          ) THEN
            ALTER TABLE "${table}"
              ADD CONSTRAINT "FK_${table}_vendor"
              FOREIGN KEY ("vendor_id") REFERENCES "vendor" ("id")
              ON DELETE SET NULL;
          END IF;
        END
        $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      "p2p_invoice",
      "p2p_purchase_order",
      "p2p_requisition",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_vendor"`,
      );
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_vendor_id"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "vendor_id"`,
      );
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vendor_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_vendor_tenant_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vendor_status_enum"`);
  }
}
