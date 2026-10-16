import type { QueryRunner } from "typeorm";
import { AddLpoApprovalGovernanceColumns1777000000008 } from "../1777000000008-AddLpoApprovalGovernanceColumns";

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

describe("AddLpoApprovalGovernanceColumns1777000000008", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddLpoApprovalGovernanceColumns1777000000008().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds all three governance columns idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddLpoApprovalGovernanceColumns1777000000008().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "approval_status"');
    expect(sql).toContain("NOT NULL DEFAULT 'APPROVED'");
    expect(sql).toContain('ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "variance_flag"');
    expect(sql).toContain("NOT NULL DEFAULT 'NO_VARIANCE'");
    expect(sql).toContain('ALTER TABLE "lpo" ADD COLUMN IF NOT EXISTS "override_reason" text');
    expect(sql).toContain('"IDX_lpo_tenant_approval_status"');
  });

  it("drops the index and columns on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddLpoApprovalGovernanceColumns1777000000008().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_lpo_tenant_approval_status"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "override_reason"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "variance_flag"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "approval_status"');
  });
});
