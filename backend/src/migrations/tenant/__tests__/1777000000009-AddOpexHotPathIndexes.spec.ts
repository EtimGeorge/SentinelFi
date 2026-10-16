import type { QueryRunner } from "typeorm";
import { AddOpexHotPathIndexes1777000000009 } from "../1777000000009-AddOpexHotPathIndexes";

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

describe("AddOpexHotPathIndexes1777000000009", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddOpexHotPathIndexes1777000000009().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds the missing payroll_entry indexes idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddOpexHotPathIndexes1777000000009().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_payroll_entry_tenant"\n        ON "payroll_entry" ("tenant_id")',
    );
    expect(sql).toContain('"IDX_payroll_entry_budget"');
    expect(sql).toContain('"IDX_payroll_entry_tenant_budget"');
    expect(sql).toContain(
      '"IDX_payroll_entry_tenant_budget"\n        ON "payroll_entry" ("tenant_id", "operational_budget_id")',
    );
    expect(sql).toContain('"IDX_payroll_entry_tenant_status"');
  });

  it("adds the status-covering encumbrance index", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddOpexHotPathIndexes1777000000009().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      '"IDX_opex_encumbrance_budget_status"\n        ON "opex_encumbrance" ("tenant_id", "operational_budget_id", "status")',
    );
  });

  it("drops every index on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddOpexHotPathIndexes1777000000009().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_opex_encumbrance_budget_status"');
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_payroll_entry_tenant_status"');
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_payroll_entry_tenant_budget"');
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_payroll_entry_budget"');
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_payroll_entry_tenant"');
  });
});
