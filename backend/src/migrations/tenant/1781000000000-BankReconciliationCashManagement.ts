import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bank Reconciliation + Cash Management tables (tenant schema).
 *
 * Provides accountants and financial institutions with bank account
 * management, statement-line import, and reconciliation workflows:
 *   - BankAccount: tenant bank accounts with currency + balances
   - BankStatementLine: imported statement transactions (credit/debit)
   - BankReconciliation: reconciliation sessions (as-of date, balances)
   - BankReconciliationLine: matched GL <-> bank line pairs
 *
 * All tables are tenant-scoped (tenant_id + RLS-ready). Approval governance
 * writes to approval_log via the service layer.
 */
export class BankReconciliationCashManagement1781000000000 implements MigrationInterface {
  name = "BankReconciliationCashManagement1781000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM's `schema` DataSource option does NOT set the session
    // `search_path`, so unqualified DDL below would otherwise land in the
    // pooled session's default schema. Resolve the tenant schema and pin
    // search_path explicitly, matching every other tenant migration.
    const schema = (queryRunner.connection.options as { schema?: string }).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }
    // uuid_generate_v4() lives in the uuid-ossp extension. Ensure it exists and
    // is visible on this session's search_path before any table DDL uses it.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Reconciliation status enum
    // NOTE: the existence check MUST be schema-scoped (pg_type is global and a
    // same-named enum may exist in another tenant schema). A bare `typname`
    // lookup would find solution_energy's enum and skip creation, then the
    // CREATE TABLE below would fail with "type does not exist".
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'reconciliation_status_enum'
            AND n.nspname = current_schema()
        ) THEN
          CREATE TYPE "reconciliation_status_enum" AS ENUM ('OPEN', 'MATCHED', 'APPROVED', 'POSTED', 'CANCELLED');
        END IF;
      END $$;
    `);

    // Match type enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE t.typname = 'reconciliation_match_type_enum'
            AND n.nspname = current_schema()
        ) THEN
          CREATE TYPE "reconciliation_match_type_enum" AS ENUM ('AUTO', 'MANUAL');
        END IF;
      END $$;
    `);

    // Bank accounts (tenant-scoped)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_account" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "account_name" character varying(255) NOT NULL,
        "account_number_masked" character varying(50) NOT NULL,
        "bank_name" character varying(255) NOT NULL,
        "currency_code" character varying(3) NOT NULL DEFAULT 'USD',
        "opening_balance" numeric(19,4) NOT NULL DEFAULT '0',
        "current_balance" numeric(19,4) NOT NULL DEFAULT '0',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_account_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_account_tenant" ON "bank_account" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_account_active" ON "bank_account" ("tenant_id", "is_active")`);

    // Bank statement lines (tenant-scoped, imported transactions)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_statement_line" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "bank_account_id" uuid NOT NULL,
        "statement_reference" character varying(255) NOT NULL,
        "transaction_date" date NOT NULL,
        "description" text NOT NULL,
        "amount" numeric(19,4) NOT NULL,
        "balance_after" numeric(19,4),
        "reference_number" character varying(255),
        "is_matched" boolean NOT NULL DEFAULT false,
        "matched_reconciliation_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_statement_line_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bank_statement_line_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_statement_line_tenant" ON "bank_statement_line" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_statement_line_account" ON "bank_statement_line" ("bank_account_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_statement_line_date" ON "bank_statement_line" ("transaction_date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_statement_line_matched" ON "bank_statement_line" ("is_matched")`);

    // Reconciliation sessions (tenant-scoped)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_reconciliation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "bank_account_id" uuid NOT NULL,
        "reconciliation_date" date NOT NULL,
        "statement_balance" numeric(19,4) NOT NULL,
        "book_balance" numeric(19,4) NOT NULL DEFAULT '0',
        "difference" numeric(19,4) NOT NULL DEFAULT '0',
        "status" "reconciliation_status_enum" NOT NULL DEFAULT 'OPEN',
        "approved_by_user_id" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "created_by_user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_reconciliation_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bank_reconciliation_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_tenant" ON "bank_reconciliation" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_account" ON "bank_reconciliation" ("bank_account_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_status" ON "bank_reconciliation" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_date" ON "bank_reconciliation" ("reconciliation_date")`);

    // Reconciliation lines (matched pairs)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_reconciliation_line" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "reconciliation_id" uuid NOT NULL,
        "bank_statement_line_id" uuid,
        "amount" numeric(19,4) NOT NULL,
        "match_type" "reconciliation_match_type_enum" NOT NULL DEFAULT 'MANUAL',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bank_reconciliation_line_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bank_reconciliation_line_reconciliation" FOREIGN KEY ("reconciliation_id") REFERENCES "bank_reconciliation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bank_reconciliation_line_statement" FOREIGN KEY ("bank_statement_line_id") REFERENCES "bank_statement_line"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_line_tenant" ON "bank_reconciliation_line" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_line_reconciliation" ON "bank_reconciliation_line" ("reconciliation_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bank_reconciliation_line_statement" ON "bank_reconciliation_line" ("bank_statement_line_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_reconciliation_line"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_reconciliation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_statement_line"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_account"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reconciliation_match_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reconciliation_status_enum"`);
  }
}
