import type { QueryRunner } from "typeorm";
import { AddP2PLineItems1777000000006 } from "../1777000000006-AddP2PLineItems";

function recordingRunner(schema = "tenant_alpha") {
  const recorded: string[] = [];
  const runner = {
    connection: { options: { type: "postgres", schema } },
    query: jest.fn(async (sql: string) => {
      recorded.push(sql);
      return [];
    }),
  } as unknown as QueryRunner;
  return { runner, recorded };
}

describe("AddP2PLineItems1777000000006", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddP2PLineItems1777000000006().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("creates both line tables with their FKs and indexes", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddP2PLineItems1777000000006().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS "p2p_purchase_order_line"',
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "p2p_receipt_line"');
    expect(sql).toContain("FK_p2p_purchase_order_line_po");
    expect(sql).toContain("FK_p2p_receipt_line_receipt");
    expect(sql).toContain("FK_p2p_receipt_line_po_line");
    expect(sql).toContain('UQ_po_line_number');
  });

  it("drops both tables on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddP2PLineItems1777000000006().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP TABLE IF EXISTS "p2p_receipt_line"');
    expect(sql).toContain('DROP TABLE IF EXISTS "p2p_purchase_order_line"');
  });
});
