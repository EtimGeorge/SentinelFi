import { ForbiddenException } from "@nestjs/common";
import * as crypto from "crypto";
import {
  WebhookService,
  WEBHOOK_CLAIM_STALE_MS,
  MAX_FULFILLMENT_ATTEMPTS,
} from "./webhook.service";
import { WebhookFulfillmentStatus } from "./entities/processed-webhook.entity";

/**
 * SEC-2026-002 security suite (signature verification) + the at-least-once
 * claim state machine that replaced the one-shot ledger-before-fulfillment
 * dedupe. In-memory fake ledger; no database.
 */
const SECRET = "test-paystack-secret-key";

let seq = 0;
function makeLedger(seed: any[] = []) {
  const rows = new Map<string, any>();
  for (const r of seed) rows.set(r.gateway_event_id, { ...r });
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === "object" && v.type === "lessThan")
        return row[k] != null && row[k] < v.value;
      return row[k] === v;
    });
  return {
    rows,
    insert: jest.fn(async (values: any) => {
      if (rows.has(values.gateway_event_id)) {
        const err: any = new Error(
          'duplicate key value violates unique constraint "processed_webhooks_gateway_event_id_key"',
        );
        err.code = "23505";
        throw err;
      }
      const id = `row-${++seq}`;
      rows.set(values.gateway_event_id, { id, ...values });
      return { identifiers: [{ id }] };
    }),
    findOne: jest.fn(async ({ where }: any) => {
      for (const row of rows.values())
        if (row.gateway_event_id === where.gateway_event_id)
          return { ...row };
      return null;
    }),
    update: jest.fn(async (criteria: any, partial: any) => {
      let affected = 0;
      for (const row of rows.values()) {
        if (matches(row, criteria)) {
          Object.assign(row, partial);
          affected++;
        }
      }
      return { affected };
    }),
    find: jest.fn(async ({ where, take }: any) => {
      const clauses = Array.isArray(where) ? where : [where];
      return [...rows.values()]
        .filter((row) => clauses.some((c: any) => matches(row, c)))
        .slice(0, take)
        .map((r) => ({ ...r }));
    }),
  };
}

function makeService(opts?: {
  paypalEnv?: Record<string, string | undefined>;
  ledger?: ReturnType<typeof makeLedger>;
}) {
  const configService = {
    get: (key: string) => {
      if (key === "PAYSTACK_SECRET_KEY") return SECRET;
      return opts?.paypalEnv?.[key];
    },
  } as any;
  const ledger = opts?.ledger ?? makeLedger();
  const service = new WebhookService(configService, ledger as any);
  return { service, ledger };
}

const sign = (raw: string) =>
  crypto.createHmac("sha512", SECRET).update(raw).digest("hex");

describe("WebhookService", () => {
  describe("verifyPaystack (security)", () => {
    it("accepts a correctly signed event and RETURNS THE PARSED EVENT (no ledger write)", async () => {
      const { service, ledger } = makeService();
      const raw = JSON.stringify({
        event: "charge.success",
        data: { id: "evt-123" },
      });
      const event = await service.verifyPaystack(raw, sign(raw));
      expect(event.event).toBe("charge.success");
      expect(event.data.id).toBe("evt-123");
      // Verification ONLY — the ledger write happens in claimEvent() so a
      // later fulfillment failure stays re-claimable (the root-defect fix).
      expect(ledger.insert).not.toHaveBeenCalled();
    });

    it("rejects a forged signature with 403 (fail-closed)", async () => {
      const { service } = makeService();
      const raw = JSON.stringify({
        event: "charge.success",
        data: { id: "evt-9" },
      });
      await expect(
        service.verifyPaystack(raw, "0".repeat(128)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects a missing signature with 403, not 500", async () => {
      const { service } = makeService();
      const raw = JSON.stringify({
        event: "charge.success",
        data: { id: "evt-1" },
      });
      await expect(service.verifyPaystack(raw, "" as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects malformed JSON with 403 (no 500 retry-signal to attacker)", async () => {
      const { service } = makeService();
      const raw = "{not-json";
      // Sign the malformed body so we reach the JSON.parse branch
      await expect(service.verifyPaystack(raw, sign(raw))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects events without any event id (both shapes)", async () => {
      const { service } = makeService();
      const raw = JSON.stringify({ event: "charge.success", data: {} });
      await expect(service.verifyPaystack(raw, sign(raw))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("verifyPaypal (security)", () => {
    // SEC-2026-003: fixtures must satisfy the header shape/freshness gate —
    // allowlisted cert host, known auth algo, transmission within ±15 min.
    const headers = () => ({
      transmissionId: "tx-1",
      transmissionTime: new Date().toISOString(),
      certUrl: "https://api.sandbox.paypal.com/certs/cert.pem",
      authAlgo: "SHA256withRSA",
      transmissionSig: "sig",
    });

    it("rejects payloads without transmission headers (fail-closed)", async () => {
      const { service } = makeService();
      await expect(service.verifyPaypal({ id: "WH-1" }, {} as any)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects payloads without an event id", async () => {
      const { service } = makeService();
      await expect(service.verifyPaypal({}, headers())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("accepts header-present events when remote verify is unconfigured (dev)", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal({ id: "WH-2" }, headers()),
      ).resolves.toBeUndefined(); // verification only — no dedupe here
    });

    it("rejects a forged cert_url (non-PayPal host) — SSRF-shaped forgery", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal(
          { id: "WH-evil" },
          { ...headers(), certUrl: "https://evil.example.com/cert.pem" },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects http:// and file:// cert_url shapes", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal(
          { id: "WH-evil2" },
          { ...headers(), certUrl: "http://api.sandbox.paypal.com/certs/x" },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.verifyPaypal(
          { id: "WH-evil3" },
          { ...headers(), certUrl: "file:///etc/passwd" },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects stale transmission_time (replay outside ±15min window)", async () => {
      const { service } = makeService({ paypalEnv: {} });
      const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await expect(
        service.verifyPaypal(
          { id: "WH-stale" },
          { ...headers(), transmissionTime: stale },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("claimEvent (at-least-once state machine)", () => {
    it("claims a new event as PROCESSING with attempts=1", async () => {
      const { service, ledger } = makeService();
      const out = await service.claimEvent("evt-1", "paystack", { a: 1 });
      expect(out.claimed).toBe(true);
      const row = [...ledger.rows.values()][0];
      expect(row.status).toBe(WebhookFulfillmentStatus.PROCESSING);
      expect(row.attempts).toBe(1);
      expect(row.claimed_at).toBeInstanceOf(Date);
      expect(row.payload).toEqual({ a: 1 });
    });

    it("drops a FULFILLED event as duplicate", async () => {
      const { service } = makeService({
        ledger: makeLedger([
          {
            id: "r1",
            gateway_event_id: "evt-2",
            provider: "paystack",
            status: WebhookFulfillmentStatus.FULFILLED,
            attempts: 1,
            claimed_at: new Date(),
          },
        ]),
      });
      const out = await service.claimEvent("evt-2", "paystack", {});
      expect(out).toEqual({ claimed: false, reason: "duplicate" });
    });

    it("drops a FRESH PROCESSING claim as in_flight (concurrent worker)", async () => {
      const { service } = makeService({
        ledger: makeLedger([
          {
            id: "r3",
            gateway_event_id: "evt-3",
            provider: "paystack",
            status: WebhookFulfillmentStatus.PROCESSING,
            attempts: 1,
            claimed_at: new Date(),
          },
        ]),
      });
      const out = await service.claimEvent("evt-3", "paystack", {});
      expect(out).toEqual({ claimed: false, reason: "in_flight" });
    });

    it("RE-CLAIMS a stale PROCESSING claim (dead worker) with attempts+1", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([
          {
            id: "r4",
            gateway_event_id: "evt-4",
            provider: "paystack",
            status: WebhookFulfillmentStatus.PROCESSING,
            attempts: 1,
            claimed_at: new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS - 1000),
          },
        ]),
      });
      const out = await service.claimEvent("evt-4", "paystack", {});
      expect(out).toEqual({ claimed: true, recordId: "r4" });
      const row = ledger.rows.get("evt-4");
      expect(row.status).toBe(WebhookFulfillmentStatus.PROCESSING);
      expect(row.attempts).toBe(2);
      expect(row.claimed_at.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it("RE-CLAIMS a FAILED row under the attempt cap (the defect this fixes)", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([
          {
            id: "r5",
            gateway_event_id: "evt-5",
            provider: "paystack",
            status: WebhookFulfillmentStatus.FAILED,
            attempts: 1,
            claimed_at: new Date(Date.now() - 60_000),
            last_error: "provisioning exploded",
          },
        ]),
      });
      const out = await service.claimEvent("evt-5", "paystack", {});
      expect(out).toEqual({ claimed: true, recordId: "r5" });
      const row = ledger.rows.get("evt-5");
      expect(row.attempts).toBe(2);
      expect(row.status).toBe(WebhookFulfillmentStatus.PROCESSING);
      expect(row.last_error).toBeNull();
    });

    it("refuses a FAILED row at the attempt cap (exhausted)", async () => {
      const { service } = makeService({
        ledger: makeLedger([
          {
            id: "r6",
            gateway_event_id: "evt-6",
            provider: "paystack",
            status: WebhookFulfillmentStatus.FAILED,
            attempts: MAX_FULFILLMENT_ATTEMPTS,
            claimed_at: new Date(Date.now() - 60_000),
            last_error: "still broken",
          },
        ]),
      });
      const out = await service.claimEvent("evt-6", "paystack", {});
      expect(out).toEqual({ claimed: false, reason: "exhausted" });
    });

    it("loses the CAS race gracefully when a concurrent worker settles first", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([
          {
            id: "r7",
            gateway_event_id: "evt-7",
            provider: "paystack",
            status: WebhookFulfillmentStatus.FAILED,
            attempts: 1,
            claimed_at: new Date(Date.now() - 60_000),
          },
        ]),
      });
      // Simulate the row changing between findOne and the CAS update.
      ledger.update.mockImplementationOnce(async () => ({ affected: 0 }));
      const out = await service.claimEvent("evt-7", "paystack", {});
      expect(out).toEqual({ claimed: false, reason: "in_flight" });
    });
  });

  describe("markFulfilled / markFailed", () => {
    const processingRow = (id: string, eventId: string, over: any = {}) => ({
      id,
      gateway_event_id: eventId,
      provider: "paystack",
      status: WebhookFulfillmentStatus.PROCESSING,
      attempts: 2,
      claimed_at: new Date(),
      ...over,
    });

    it("markFulfilled settles PROCESSING → FULFILLED with refs and clears last_error", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([
          processingRow("m1", "evt-m1", { last_error: "old" }),
        ]),
      });
      await service.markFulfilled("m1", {
        subscriptionId: "sub-9",
        tenantId: "t-9",
      });
      const row = ledger.rows.get("evt-m1");
      expect(row.status).toBe(WebhookFulfillmentStatus.FULFILLED);
      expect(row.fulfilled_at).toBeInstanceOf(Date);
      expect(row.subscription_id).toBe("sub-9");
      expect(row.tenant_id).toBe("t-9");
      expect(row.last_error).toBeNull();
    });

    it("markFailed records the error and keeps the row re-claimable (attempts unchanged)", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([processingRow("m2", "evt-m2")]),
      });
      await service.markFailed("m2", "migration failed ".repeat(300));
      const row = ledger.rows.get("evt-m2");
      expect(row.status).toBe(WebhookFulfillmentStatus.FAILED);
      expect(row.attempts).toBe(2);
      expect(row.last_error.length).toBeLessThanOrEqual(2000);
      expect(row.last_error).toContain("migration failed");
    });

    it("markFailed with terminal burns the attempt cap immediately", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([processingRow("m3", "evt-m3")]),
      });
      await service.markFailed("m3", "unattributable payment", {
        terminal: true,
      });
      const row = ledger.rows.get("evt-m3");
      expect(row.status).toBe(WebhookFulfillmentStatus.FAILED);
      expect(row.attempts).toBe(MAX_FULFILLMENT_ATTEMPTS);
      // …so a subsequent delivery is dropped as exhausted:
      const out = await service.claimEvent("evt-m3", "paystack", {});
      expect(out).toEqual({ claimed: false, reason: "exhausted" });
    });

    it("settling a claim that was taken over is a logged no-op (CAS on PROCESSING)", async () => {
      const { service, ledger } = makeService({
        ledger: makeLedger([
          processingRow("m4", "evt-m4", {
            status: WebhookFulfillmentStatus.FULFILLED,
          }),
        ]),
      });
      await service.markFailed("m4", "too late");
      expect(ledger.rows.get("evt-m4").status).toBe(
        WebhookFulfillmentStatus.FULFILLED,
      );
    });
  });

  describe("findReplayable (cron scan)", () => {
    it("returns FAILED under cap + stale PROCESSING; excludes fulfilled, fresh PROCESSING and exhausted", async () => {
      const stale = new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS - 1000);
      const fresh = new Date();
      const { service } = makeService({
        ledger: makeLedger([
          {
            id: "a",
            gateway_event_id: "ok-done",
            status: WebhookFulfillmentStatus.FULFILLED,
            attempts: 1,
            claimed_at: fresh,
          },
          {
            id: "b",
            gateway_event_id: "ok-failed",
            status: WebhookFulfillmentStatus.FAILED,
            attempts: 2,
            claimed_at: fresh,
          },
          {
            id: "c",
            gateway_event_id: "ok-fresh",
            status: WebhookFulfillmentStatus.PROCESSING,
            attempts: 1,
            claimed_at: fresh,
          },
          {
            id: "d",
            gateway_event_id: "ok-dead",
            status: WebhookFulfillmentStatus.PROCESSING,
            attempts: 3,
            claimed_at: stale,
          },
          {
            id: "e",
            gateway_event_id: "ok-exhausted",
            status: WebhookFulfillmentStatus.FAILED,
            attempts: MAX_FULFILLMENT_ATTEMPTS,
            claimed_at: stale,
          },
        ]),
      });
      const rows = await service.findReplayable();
      expect(rows.map((r) => r.gateway_event_id).sort()).toEqual([
        "ok-dead",
        "ok-failed",
      ]);
    });
  });


});
