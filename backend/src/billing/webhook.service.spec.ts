import { ForbiddenException } from "@nestjs/common";
import * as crypto from "crypto";
import { WebhookService } from "./webhook.service";

/**
 * SEC-2026-002 regression suite: Paystack HMAC verification + PayPal
 * fail-closed header checks + idempotency, without touching a database.
 */
describe("WebhookService", () => {
  const SECRET = "test-paystack-secret-key";

  const makeService = (overrides?: {
    processed?: { gateway_event_id: string } | null;
    paypalEnv?: Record<string, string | undefined>;
  }) => {
    const configService = {
      get: (key: string) => {
        if (key === "PAYSTACK_SECRET_KEY") return SECRET;
        return overrides?.paypalEnv?.[key];
      },
    } as any;
    const store: any[] = [];
    const processedWebhookRepository = {
      findOne: jest.fn(async ({ where }: any) =>
        overrides?.processed &&
        overrides.processed.gateway_event_id === where.gateway_event_id
          ? overrides.processed
          : null,
      ),
      create: jest.fn((dto: any) => dto),
      save: jest.fn(async (dto: any) => {
        store.push(dto);
        return dto;
      }),
    } as any;
    const service = new WebhookService(configService, processedWebhookRepository);
    return { service, processedWebhookRepository, store };
  };

  const sign = (raw: string) =>
    crypto.createHmac("sha512", SECRET).update(raw).digest("hex");

  describe("verifyPaystack", () => {
    it("accepts a correctly signed event and persists idempotency record", async () => {
      const { service, store } = makeService();
      const raw = JSON.stringify({ event: "charge.success", data: { id: "evt-123" } });
      const ok = await service.verifyPaystack(raw, sign(raw));
      expect(ok).toBe(true);
      expect(store).toHaveLength(1);
      expect(store[0].gateway_event_id).toBe("evt-123");
    });

    it("rejects a forged signature with 403 (fail-closed)", async () => {
      const { service } = makeService();
      const raw = JSON.stringify({ event: "charge.success", data: { id: "evt-9" } });
      await expect(service.verifyPaystack(raw, "0".repeat(128))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("rejects a missing signature with 403, not 500", async () => {
      const { service } = makeService();
      const raw = JSON.stringify({ event: "charge.success", data: { id: "evt-1" } });
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

    it("returns false (no fulfillment) for replayed event ids", async () => {
      const { service, processedWebhookRepository } = makeService({
        processed: { gateway_event_id: "evt-replay" },
      });
      const raw = JSON.stringify({ event: "charge.success", data: { id: "evt-replay" } });
      const ok = await service.verifyPaystack(raw, sign(raw));
      expect(ok).toBe(false);
      expect(processedWebhookRepository.save).not.toHaveBeenCalled();
    });

    it("treats a concurrent duplicate insert (unique violation) as a replay, not a 500", async () => {
      const { service, processedWebhookRepository } = makeService();
      const uniqueErr: any = new Error(
        'duplicate key value violates unique constraint "processed_webhooks_gateway_event_id_key"',
      );
      uniqueErr.code = "23505";
      processedWebhookRepository.save.mockRejectedValueOnce(uniqueErr);
      const raw = JSON.stringify({ event: "charge.success", data: { id: "evt-race" } });
      await expect(service.verifyPaystack(raw, sign(raw))).resolves.toBe(false);
    });
  });

  describe("verifyPaypal", () => {
    // SEC-2026-003: fixtures must satisfy the header shape/freshness gate —
    // allowlisted cert host, known auth algo, transmission within ±15 min.
    const headers = {
      transmissionId: "tx-1",
      transmissionTime: new Date().toISOString(),
      certUrl: "https://api.sandbox.paypal.com/certs/cert.pem",
      authAlgo: "SHA256withRSA",
      transmissionSig: "sig",
    };

    it("rejects payloads without transmission headers (fail-closed)", async () => {
      const { service } = makeService();
      await expect(
        service.verifyPaypal({ id: "WH-1" }, {} as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects payloads without an event id", async () => {
      const { service } = makeService();
      await expect(service.verifyPaypal({}, headers)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("accepts header-present events when remote verify is unconfigured (dev) and dedupes replays", async () => {
      const { service } = makeService({ paypalEnv: {} });
      const ok = await service.verifyPaypal({ id: "WH-2" }, headers);
      expect(ok).toBe(true);
      const replay = makeService({
        paypalEnv: {},
        processed: { gateway_event_id: "WH-2" },
      });
      const again = await replay.service.verifyPaypal({ id: "WH-2" }, headers);
      expect(again).toBe(false);
    });

    it("rejects a forged cert_url (non-PayPal host) — SSRF-shaped forgery", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal({ id: "WH-evil" }, { ...headers, certUrl: "https://evil.example.com/cert.pem" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects http:// and file:// cert_url shapes", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal({ id: "WH-evil2" }, { ...headers, certUrl: "http://api.sandbox.paypal.com/certs/x" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.verifyPaypal({ id: "WH-evil3" }, { ...headers, certUrl: "file:///etc/passwd" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects stale transmission_time (replay outside ±15min window)", async () => {
      const { service } = makeService({ paypalEnv: {} });
      const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await expect(
        service.verifyPaypal({ id: "WH-stale" }, { ...headers, transmissionTime: stale }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("rejects unknown auth_algo (downgrade-shaped forgery)", async () => {
      const { service } = makeService({ paypalEnv: {} });
      await expect(
        service.verifyPaypal({ id: "WH-algo" }, { ...headers, authAlgo: "MD5withRSA" }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
