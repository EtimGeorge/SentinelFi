import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Per-tenant, per-document-type, per-year monotonic counter backing
 * gap-free, collision-safe document numbers (REQ-/PO-). Replaces the unsafe
 * `count()+1` scheme which collides under concurrency and rewinds on delete.
 *
 * The counter is advanced with an atomic
 *   INSERT ... ON CONFLICT DO UPDATE ... RETURNING
 * so concurrent callers serialise on the composite primary key row lock.
 */
export class AddDocumentSequence1777000000003 implements MigrationInterface {
  name = "AddDocumentSequence1777000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Match InitialTenantSchemaSetup / AddTenantCompositeIndexes: set the
    // search_path explicitly so unqualified DDL lands in the tenant schema
    // rather than the pooled session's default (public).
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "document_sequence" (
        "tenant_id" uuid NOT NULL,
        "doc_type" character varying(50) NOT NULL,
        "period_year" integer NOT NULL,
        "last_value" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_sequence" PRIMARY KEY ("tenant_id", "doc_type", "period_year")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_sequence"`);
  }
}
