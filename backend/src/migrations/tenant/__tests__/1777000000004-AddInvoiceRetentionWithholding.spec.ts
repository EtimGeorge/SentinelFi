import type { QueryRunner } from "typeorm";
import { AddInvoiceRetentionWithholding1777000000004 } from "../1777000000004-AddInvoiceRetentionWithholding";

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

describe("AddInvoiceRetentionWithholding1777000000004", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddInvoiceRetentionWithholding1777000000004().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds retention, WHT and net-payable columns idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddInvoiceRetentionWithholding1777000000004().up(runner);
    const sql = recorded.join("\n");
    for (const column of [
      "retention_pct",
      "retention_amount",
      "wht_pct",
      "wht_amount",
      "net_payable",
    ]) {
      expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "${column}"`);
    }
  });

  it("drops every added column on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddInvoiceRetentionWithholding1777000000004().down(runner);
    const sql = recorded.join("\n");
    for (const column of [
      "retention_pct",
      "retention_amount",
      "wht_pct",
      "wht_amount",
      "net_payable",
    ]) {
      expect(sql).toContain(`DROP COLUMN IF EXISTS "${column}"`);
    }
  });
});
