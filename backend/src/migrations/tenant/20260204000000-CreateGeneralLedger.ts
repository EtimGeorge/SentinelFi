import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * General Ledger — double-entry journal vouchers.
 *
 * Adds the two posting tables that back the GL engine:
 *   - gl_journal_entry : header (one voucher; DRAFT/POSTED/VOID)
 *   - gl_journal_line  : debit/credit legs (decimal(19,4))
 *
 * Idempotency is enforced at the database level by a partial unique index on
 * (tenant_id, source_type, source_id) for non-VOID, non-null sources, so a
 * replayed posting (e.g. a retried payroll post) cannot double-book.
 *
 * The chart-of-accounts tables (account_class/account_group/gl_account) are
 * created by 1773015288077-AddProjectSoftDelete and are not touched here.
 */
export class CreateGeneralLedger20260204000000 implements MigrationInterface {
  name = "CreateGeneralLedger20260204000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gl_journal_entry_source_type_enum' AND typnamespace = current_schema()::regnamespace) THEN
          CREATE TYPE "gl_journal_entry_source_type_enum" AS ENUM(
            'MANUAL', 'PAYROLL', 'OPEX_EXPENSE', 'PURCHASE_ORDER',
            'GOODS_RECEIPT', 'VENDOR_INVOICE', 'REVERSAL'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gl_journal_entry_status_enum' AND typnamespace = current_schema()::regnamespace) THEN
          CREATE TYPE "gl_journal_entry_status_enum" AS ENUM('DRAFT', 'POSTED', 'VOID');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gl_journal_entry" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "entry_number" character varying(40) NOT NULL,
        "entry_date" date NOT NULL,
        "memo" text,
        "source_type" "gl_journal_entry_source_type_enum" NOT NULL DEFAULT 'MANUAL',
        "source_id" uuid,
        "source_reference" character varying(150),
        "status" "gl_journal_entry_status_enum" NOT NULL DEFAULT 'DRAFT',
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "total_debit" numeric(19,4) NOT NULL DEFAULT 0,
        "total_credit" numeric(19,4) NOT NULL DEFAULT 0,
        "posted_at" TIMESTAMP WITH TIME ZONE,
        "posted_by_user_id" uuid,
        "reversal_of_entry_id" uuid,
        "reversed_by_entry_id" uuid,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gl_journal_entry" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_entry_tenant" ON "gl_journal_entry" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_entry_tenant_date" ON "gl_journal_entry" ("tenant_id", "entry_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_entry_tenant_status" ON "gl_journal_entry" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_entry_source" ON "gl_journal_entry" ("tenant_id", "source_type", "source_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_entry_reversal_of" ON "gl_journal_entry" ("reversal_of_entry_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_gl_journal_entry_tenant_number" ON "gl_journal_entry" ("tenant_id", "entry_number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_gl_journal_entry_source_active" ON "gl_journal_entry" ("tenant_id", "source_type", "source_id") WHERE "source_id" IS NOT NULL AND "status" <> 'VOID'`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "gl_journal_line" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "journal_entry_id" uuid NOT NULL,
        "gl_account_id" uuid NOT NULL,
        "cost_center_id" uuid,
        "description" character varying(255),
        "line_number" integer NOT NULL DEFAULT 1,
        "debit" numeric(19,4) NOT NULL DEFAULT 0,
        "credit" numeric(19,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gl_journal_line" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_line_tenant" ON "gl_journal_line" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_line_tenant_entry" ON "gl_journal_line" ("tenant_id", "journal_entry_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_gl_journal_line_tenant_account" ON "gl_journal_line" ("tenant_id", "gl_account_id")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_gl_journal_line_entry') THEN
          ALTER TABLE "gl_journal_line"
            ADD CONSTRAINT "FK_gl_journal_line_entry"
            FOREIGN KEY ("journal_entry_id") REFERENCES "gl_journal_entry"("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_gl_journal_line_gl_account') THEN
          ALTER TABLE "gl_journal_line"
            ADD CONSTRAINT "FK_gl_journal_line_gl_account"
            FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_journal_line"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gl_journal_entry"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "gl_journal_entry_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "gl_journal_entry_source_type_enum"`,
    );
  }
}
