import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Line-level goods receipt: purchase-order lines and receipt (GRN) lines.
 *
 * - `p2p_purchase_order_line` gives each PO explicit ordered lines with a
 *   running `received_quantity`.
 * - `p2p_receipt_line` ties each received quantity back to the PO line it
 *   fulfils, enabling partial/multi-line deliveries and line-level 3-way match.
 *
 * Both FKs cascade on delete so removing a PO/receipt cleans up its lines.
 */
export class AddP2PLineItems1777000000006 implements MigrationInterface {
  name = "AddP2PLineItems1777000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = (queryRunner.connection.options as any).schema;
    if (schema) {
      await queryRunner.query(`SET search_path TO "${schema}", public`);
    }
    // Legacy/partial schemas may not yet have base P2P tables
    const has = async (t: string) => {
      const r = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`,
        [t],
      );
      return r.length > 0;
    };
    if (!(await has("p2p_requisition")) || !(await has("p2p_invoice")) || !(await has("p2p_purchase_order"))) {
      // eslint-disable-next-line no-console
      console.log("[AddP2PLineItems] Base P2P tables missing; skipping line-item tables.");
      return;
    }

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "p2p_purchase_order_line" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "line_number" integer NOT NULL,
        "description" character varying(500) NOT NULL,
        "quantity" numeric(19,4) NOT NULL DEFAULT 1,
        "unit_amount" numeric(19,4) NOT NULL,
        "line_amount" numeric(19,4) NOT NULL,
        "received_quantity" numeric(19,4) NOT NULL DEFAULT 0,
        "gl_account_id" uuid,
        "cost_center_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_p2p_purchase_order_line" PRIMARY KEY ("id"),
        CONSTRAINT "FK_p2p_purchase_order_line_po"
          FOREIGN KEY ("purchase_order_id") REFERENCES "p2p_purchase_order" ("id")
          ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_po_line_tenant" ON "p2p_purchase_order_line" ("tenant_id", "purchase_order_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_po_line_number" ON "p2p_purchase_order_line" ("purchase_order_id", "line_number")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "p2p_receipt_line" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "receipt_id" uuid NOT NULL,
        "purchase_order_line_id" uuid,
        "quantity" numeric(19,4) NOT NULL DEFAULT 1,
        "unit_amount" numeric(19,4) NOT NULL,
        "line_amount" numeric(19,4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_p2p_receipt_line" PRIMARY KEY ("id"),
        CONSTRAINT "FK_p2p_receipt_line_receipt"
          FOREIGN KEY ("receipt_id") REFERENCES "p2p_receipt" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_p2p_receipt_line_po_line"
          FOREIGN KEY ("purchase_order_line_id") REFERENCES "p2p_purchase_order_line" ("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_receipt_line_tenant" ON "p2p_receipt_line" ("tenant_id", "receipt_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "p2p_receipt_line"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_po_line_number"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_po_line_tenant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "p2p_purchase_order_line"`);
  }
}
