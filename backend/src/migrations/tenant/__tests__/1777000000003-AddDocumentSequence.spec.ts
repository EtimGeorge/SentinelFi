import type { QueryRunner } from "typeorm";
import { AddDocumentSequence1777000000003 } from "../1777000000003-AddDocumentSequence";

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

describe("AddDocumentSequence1777000000003", () => {
  it("scopes to the tenant schema before touching anything", async () => {
    const { runner, recorded } = recordingRunner("tenant_alpha");
    await new AddDocumentSequence1777000000003().up(runner);
    expect(recorded[0]).toContain('SET search_path TO "tenant_alpha"');
  });

  it("creates the document_sequence table with a composite primary key", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddDocumentSequence1777000000003().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "document_sequence"');
    expect(sql).toContain('"tenant_id" uuid NOT NULL');
    expect(sql).toContain('"doc_type" character varying(50) NOT NULL');
    expect(sql).toContain('"period_year" integer NOT NULL');
    expect(sql).toContain('"last_value" integer NOT NULL DEFAULT 0');
    expect(sql).toContain(
      'CONSTRAINT "PK_document_sequence" PRIMARY KEY ("tenant_id", "doc_type", "period_year")',
    );
  });

  it("drops the table idempotently on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddDocumentSequence1777000000003().down(runner);
    expect(recorded.join("\n")).toContain(
      'DROP TABLE IF EXISTS "document_sequence"',
    );
  });
});
