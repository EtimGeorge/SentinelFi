import type { QueryRunner } from "typeorm";
import { AddReceiptCurrency1777000000007 } from "../1777000000007-AddReceiptCurrency";

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

describe("AddReceiptCurrency1777000000007", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddReceiptCurrency1777000000007().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds currency, exchange rate and base amount to receipts", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddReceiptCurrency1777000000007().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('ALTER TABLE "p2p_receipt"');
    expect(sql).toContain('"currency" character varying(3)');
    expect(sql).toContain('"exchange_rate" numeric(19,6)');
    expect(sql).toContain('"base_amount" numeric(19,4)');
    expect(sql).toContain('UPDATE "p2p_receipt"');
  });

  it("drops the columns on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddReceiptCurrency1777000000007().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP COLUMN IF EXISTS "base_amount"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "base_amount"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "currency"');
  });
});
