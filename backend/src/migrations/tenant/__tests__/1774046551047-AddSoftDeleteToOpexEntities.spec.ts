import type { QueryRunner } from "typeorm";
import { AddSoftDeleteToOpexEntities1774046551047 } from "../1774046551047-AddSoftDeleteToOpexEntities";

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

describe("AddSoftDeleteToOpexEntities1774046551047", () => {
  // Root-cause regression: the migration was auto-generated against the
  // `solution_energy` tenant, so every statement hard-coded that literal schema
  // and it never set search_path. For any other tenant it hit the wrong schema
  // and died on its first statement, stranding the whole ordered run and
  // breaking new-tenant provisioning.
  it("sets search_path to the tenant schema before any DDL", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("never hard-codes a literal schema name in any emitted statement", async () => {
    const { runner, recorded } = recordingRunner("tenant_zeta");
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    await new AddSoftDeleteToOpexEntities1774046551047().down(runner);

    // Every statement must either set search_path or use unqualified names.
    for (const sql of recorded) {
      expect(sql).not.toContain('"solution_energy".');
      expect(sql).not.toMatch(/"tenant_alpha"\.|"tenant_zeta"\./);
    }
  });

  // Platform tables belong to the `public` schema (their entities declare
  // schema:"public" or are unqualified → default DataSource). Creating them in
  // a tenant schema produced dead, never-read copies and — for the two with no
  // public migration — hid a real gap. They must not appear here at all.
  it("does not create platform tables in the tenant schema", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    const sql = recorded.join("\n");

    for (const table of [
      "billing_invoices",
      "invitations",
      "password_reset_tokens",
      "ai_audit_logs",
    ]) {
      // Targeted check: no CREATE for that table name.
      expect(sql).not.toMatch(new RegExp(`CREATE TABLE[^;]*"${table}"`));
    }
  });

  // Messaging + generic soft-delete are re-applied idempotently by
  // 1776000000002 and 1776000000000 later in the same ordered run. Duplicating
  // them here was the bug; they must be gone.
  it("delegates messaging and generic soft-delete to their owning migrations", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    const sql = recorded.join("\n");

    expect(sql).not.toContain("conversation");
    expect(sql).not.toContain("receiver_id");
    expect(sql).not.toContain('RENAME COLUMN "receiver_id"');
  });

  it("still owns the ai_report_schedule table + enums + FK", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    const sql = recorded.join("\n");

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "ai_report_schedule"');
    expect(sql).toContain('CREATE TYPE "ai_report_schedule_frequency_enum"');
    expect(sql).toContain('CREATE TYPE "ai_report_schedule_status_enum"');
    expect(sql).toContain("FK_a1957a10d18ba3883f8f9035c3a");
  });

  it("converts operational_expense.variance_flag to the enum only when needed", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);
    const sql = recorded.join("\n");

    expect(sql).toContain('CREATE TYPE "operational_expense_variance_flag_enum"');
    // Must be guarded by the column's current udt so a re-run is a no-op rather
    // than a blind DROP/ADD.
    expect(sql).toContain("information_schema.columns");
    expect(sql).toContain(
      "IS DISTINCT FROM 'operational_expense_variance_flag_enum'",
    );
  });

  // Idempotence: every destructive/creative statement is guarded, so a second
  // run on an already-migrated schema is a safe no-op. This is what lets a
  // forward-repair migration re-assert state without colliding.
  it("emits only idempotent statements (IF EXISTS / IF NOT EXISTS / DO blocks)", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().up(runner);

    for (const sql of recorded) {
      const s = sql.trim();
      if (s.startsWith("DO $$")) continue; // plpgsql guards are self-idempotent
      if (/^(CREATE INDEX|CREATE TABLE|DROP INDEX|DROP TABLE|DROP TYPE|CREATE TYPE)/i.test(s)) {
        expect(s).toMatch(/IF (NOT )?EXISTS/i);
      }
      if (/^(ALTER TABLE)/i.test(s) && /DROP CONSTRAINT/i.test(s)) {
        expect(s).toMatch(/IF EXISTS/i);
      }
    }
  });

  it("drops ai_report_schedule and reverts the enum on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddSoftDeleteToOpexEntities1774046551047().down(runner);
    const sql = recorded.join("\n");

    expect(sql).toContain('DROP TABLE IF EXISTS "ai_report_schedule"');
    expect(sql).toContain('DROP TYPE IF EXISTS "ai_report_schedule_status_enum"');
  });
});
