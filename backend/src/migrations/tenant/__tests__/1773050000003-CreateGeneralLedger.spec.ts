import type { QueryRunner } from "typeorm";
import { CreateGeneralLedger1773050000003 } from "../1773050000003-CreateGeneralLedger";

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

describe("CreateGeneralLedger1773050000003", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new CreateGeneralLedger1773050000003().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("creates both GL enum types idempotently", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateGeneralLedger1773050000003().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain("gl_journal_entry_source_type_enum");
    expect(sql).toContain("gl_journal_entry_status_enum");
    expect(sql).toContain("'DRAFT', 'POSTED', 'VOID'");
    expect(sql).toContain("'PAYROLL'");
  });

  it("creates the journal entry + line tables", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateGeneralLedger1773050000003().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "gl_journal_entry"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "gl_journal_line"');
    expect(sql).toContain('"total_debit" numeric(19,4) NOT NULL DEFAULT 0');
    expect(sql).toContain('"debit" numeric(19,4) NOT NULL DEFAULT 0');
    expect(sql).toContain('"credit" numeric(19,4) NOT NULL DEFAULT 0');
  });

  it("enforces source idempotency via a partial unique index", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateGeneralLedger1773050000003().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('"UQ_gl_journal_entry_source_active"');
    expect(sql).toContain(
      `WHERE "source_id" IS NOT NULL AND "status" <> 'VOID'`,
    );
    expect(sql).toContain('"UQ_gl_journal_entry_tenant_number"');
  });

  it("drops the tables and enums on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateGeneralLedger1773050000003().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP TABLE IF EXISTS "gl_journal_line"');
    expect(sql).toContain('DROP TABLE IF EXISTS "gl_journal_entry"');
    expect(sql).toContain('DROP TYPE IF EXISTS "gl_journal_entry_status_enum"');
    expect(sql).toContain(
      'DROP TYPE IF EXISTS "gl_journal_entry_source_type_enum"',
    );
  });
});
