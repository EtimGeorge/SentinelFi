import type { QueryRunner } from "typeorm";
import { CreatePlatformAuthAndAuditTables20260203000000 } from "../20260203000000-CreatePlatformAuthAndAuditTables";

function recordingRunner() {
  const recorded: string[] = [];
  const runner = {
    connection: { options: { type: "postgres", schema: "public" } },
    query: jest.fn(async (sql: string) => {
      recorded.push(sql);
      return [];
    }),
  } as unknown as QueryRunner;
  return { runner, recorded };
}

describe("CreatePlatformAuthAndAuditTables20260203000000", () => {
  // These two tables were previously (mis)created inside the tenant schema by
  // 1774046551047. Their entities live in `public`, so they belong here. This
  // migration is the safety net that keeps them from being orphaned now that
  // the tenant migration no longer creates them.
  it("creates password_reset_tokens and ai_audit_logs in public", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreatePlatformAuthAndAuditTables20260203000000().up(runner);
    const sql = recorded.join("\n");

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "password_reset_tokens"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "ai_audit_logs"');
    expect(sql).toContain('CREATE TYPE "ai_audit_logs_interaction_type_enum"');
  });

  it("does NOT recreate platform tables owned by their own public migrations", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreatePlatformAuthAndAuditTables20260203000000().up(runner);
    const sql = recorded.join("\n");

    // billing_invoices (1773900000000), invitations/subscriptions (1773705230787)
    for (const table of ["billing_invoices", "invitations", "subscriptions"]) {
      expect(sql).not.toMatch(new RegExp(`CREATE TABLE[^;]*"${table}"`));
    }
  });

  it("scopes the enum guard to the public namespace", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreatePlatformAuthAndAuditTables20260203000000().up(runner);

    const enumGuard = recorded.find((sql) =>
      sql.includes("ai_audit_logs_interaction_type_enum"),
    );
    expect(enumGuard).toBeDefined();
    expect(enumGuard).toContain("n.nspname = 'public'");
  });

  it("is fully idempotent on re-run", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreatePlatformAuthAndAuditTables20260203000000().up(runner);

    for (const sql of recorded) {
      const s = sql.trim();
      if (s.startsWith("DO $$")) continue;
      if (/^(CREATE INDEX|CREATE TABLE|CREATE TYPE)/i.test(s)) {
        expect(s).toMatch(/IF NOT EXISTS/i);
      }
    }
  });

  it("drops both tables and the enum on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreatePlatformAuthAndAuditTables20260203000000().down(runner);
    const sql = recorded.join("\n");

    expect(sql).toContain('DROP TABLE IF EXISTS "ai_audit_logs"');
    expect(sql).toContain('DROP TABLE IF EXISTS "password_reset_tokens"');
    expect(sql).toContain(
      'DROP TYPE IF EXISTS "ai_audit_logs_interaction_type_enum"',
    );
  });
});
