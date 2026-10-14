import type { QueryRunner } from "typeorm";
import { AddAiReportScheduleConsolidationColumns1777000000002 } from "../1777000000002-AddAiReportScheduleConsolidationColumns";

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

describe("AddAiReportScheduleConsolidationColumns1777000000002", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddAiReportScheduleConsolidationColumns1777000000002().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("adds the three consolidation columns idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddAiReportScheduleConsolidationColumns1777000000002().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "name"',
    );
    expect(sql).toContain(
      'ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "filters" jsonb',
    );
    expect(sql).toContain(
      'ALTER TABLE "ai_report_schedule" ADD COLUMN IF NOT EXISTS "last_error" text',
    );
  });

  it("creates the scheduler indexes idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddAiReportScheduleConsolidationColumns1777000000002().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_ai_sched_tenant_status_next"',
    );
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_ai_sched_next_run"',
    );
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "IDX_ai_sched_tenant"');
  });

  it("never touches the legacy report_schedule table", async () => {
    const { runner, recorded } = recordingRunner();
    const m = new AddAiReportScheduleConsolidationColumns1777000000002();
    await m.up(runner);
    await m.down(runner);
    const sql = recorded.join("\n");
    // ai_report_schedule only — legacy rows stay untouched for manual review
    // because they lack created_by_id (NOT NULL here).
    expect(sql).not.toMatch(/"report_schedule"/);
  });

  it("down reverses indexes then columns", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddAiReportScheduleConsolidationColumns1777000000002().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP INDEX IF EXISTS "IDX_ai_sched_tenant_status_next"');
    expect(sql).toContain(
      'ALTER TABLE "ai_report_schedule" DROP COLUMN IF EXISTS "last_error"',
    );
  });
});
