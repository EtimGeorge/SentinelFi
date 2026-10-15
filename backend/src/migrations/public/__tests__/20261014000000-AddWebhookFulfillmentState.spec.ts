import type { QueryRunner } from "typeorm";
import { AddWebhookFulfillmentState20261014000000 } from "../20261014000000-AddWebhookFulfillmentState";

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

describe("AddWebhookFulfillmentState20261014000000", () => {
  it("adds claim state-machine columns to processed_webhooks", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddWebhookFulfillmentState20261014000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('"status" character varying NOT NULL DEFAULT \'FULFILLED\'');
    expect(sql).toContain('"attempts" integer NOT NULL DEFAULT 1');
    expect(sql).toContain('"claimed_at" TIMESTAMP WITH TIME ZONE');
    expect(sql).toContain('"fulfilled_at" TIMESTAMP WITH TIME ZONE');
    expect(sql).toContain('"last_error" text');
    expect(sql).toContain('"subscription_id" character varying(64)');
    expect(sql).toContain('"tenant_id" character varying(255)');
  });

  it("backfills existing ledger rows as fulfilled (fulfilled_at = processed_at)", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddWebhookFulfillmentState20261014000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('SET "fulfilled_at" = "processed_at"');
    expect(sql).toContain('WHERE "fulfilled_at" IS NULL');
  });

  it("creates the reconciliation indexes", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddWebhookFulfillmentState20261014000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_processed_webhooks_status_claimed_at"',
    );
    expect(sql).toContain('("status", "claimed_at")');
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_subscriptions_paid_pending"',
    );
    expect(sql).toContain('WHERE "status" = \'pending\' AND "gateway_reference" IS NOT NULL');
  });

  it("adds provisioning bookkeeping columns to subscriptions", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddWebhookFulfillmentState20261014000000().up(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('"provisioning_error" text');
    expect(sql).toContain('"provisioning_attempts" integer NOT NULL DEFAULT 0');
    expect(sql).toContain('"provisioned_at" TIMESTAMP WITH TIME ZONE');
  });

  it("drops every added column and index on rollback", async () => {
    const { runner, recorded } = recordingRunner();
    await new AddWebhookFulfillmentState20261014000000().down(runner);
    const sql = recorded.join("\n");
    expect(sql).toContain('DROP INDEX IF EXISTS "public"."IDX_subscriptions_paid_pending"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "provisioning_attempts"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "provisioned_at"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "provisioning_error"');
    expect(sql).toContain('DROP INDEX IF EXISTS "public"."IDX_processed_webhooks_status_claimed_at"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "status"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "attempts"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "last_error"');
  });
});
