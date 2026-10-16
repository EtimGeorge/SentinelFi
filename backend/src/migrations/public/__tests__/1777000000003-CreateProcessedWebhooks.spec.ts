import type { QueryRunner } from "typeorm";
import { CreateProcessedWebhooks20261013000000 } from "../20261013000000-CreateProcessedWebhooks";

function recordingRunner() {
  const recorded: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      recorded.push(sql);
      return [];
    }),
  } as unknown as QueryRunner;
  return { runner, recorded };
}

describe("CreateProcessedWebhooks20261013000000", () => {
  it("creates the public.processed_webhooks idempotency ledger", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateProcessedWebhooks20261013000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "public"."processed_webhooks"');
    expect(sql).toContain('"id" uuid NOT NULL DEFAULT uuid_generate_v4()');
    expect(sql).toContain('"gateway_event_id" character varying NOT NULL');
    expect(sql).toContain('"provider" character varying NOT NULL');
    expect(sql).toContain('"processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()');
    expect(sql).toContain('"payload" jsonb');
  });

  it("creates the unique dedupe index on gateway_event_id", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateProcessedWebhooks20261013000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_processed_webhooks_gateway_event_id"',
    );
    expect(sql).toContain('("gateway_event_id")');
  });

  it("drops the table and indexes on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new CreateProcessedWebhooks20261013000000().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP TABLE IF EXISTS "public"."processed_webhooks"');
    expect(sql).toContain('DROP INDEX IF EXISTS "public"."IDX_processed_webhooks_gateway_event_id"');
  });
});
