import * as crypto from "crypto";
import { BillingService, TerminalFulfillmentError } from "./billing.service";
import { WebhookService, MAX_FULFILLMENT_ATTEMPTS } from "./webhook.service";
import {
  SubscriptionStatus,
  BillingCycle,
} from "./entities/subscription.entity";
import { WebhookFulfillmentStatus } from "./entities/processed-webhook.entity";

/**
 * At-least-once fulfillment regression suite for the paid webhook chain.
 *
 * The root defect this pins: the ledger row was written BEFORE fulfillment,
 * so a captured payment whose provisioning failed was deduped away on every
 * gateway retry — permanently lost, invisible. Now: claim → fulfill → settle,
 * failures RE-CLAIM on retry, terminal failures burn the attempt cap.
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

function pendingSub(over: any = {}) {
  return {
    id: "sub-1",
    status: SubscriptionStatus.PENDING,
    tenant_id: null,
    plan: "professional",
    billing_cycle: BillingCycle.MONTHLY,
    amount_usd: 20,
    gateway: "paystack",
    gateway_reference: "ref-1",
    admin_email: "admin@acme.com",
    admin_first_name: "Ada",
    admin_last_name: "Lovelace",
    company_name: "Acme Corp",
    base_currency: "USD",
    provisioning_error: null,
    provisioning_attempts: 0,
    provisioned_at: null,
    ...over,
  };
}

function makeBilling(opts?: {
  sub?: any;
  ensure?: jest.Mock;
  ledger?: ReturnType<typeof makeLedger>;
}) {
  const ledger = opts?.ledger ?? makeLedger();
  const webhookService = new WebhookService(
    {
      get: (k: string) => (k === "PAYSTACK_SECRET_KEY" ? SECRET : undefined),
    } as any,
    ledger as any,
  );

  const subState: any = { ...(opts?.sub ?? pendingSub()) };
  const subscriptionRepository = {
    findOne: jest.fn(async ({ where }: any) => {
      // Id-aware: an unknown subscription id must read as "not found".
      if (where?.id && where.id !== subState.id) return null;
      return { ...subState };
    }),
    update: jest.fn(async (_criteria: any, partial: any) => {
      // The fake can't evaluate raw SQL fragments (`() => "... + 1"`), so
      // only plain values are merged — exactly what assertions need.
      for (const [k, v] of Object.entries(partial as any)) {
        if (typeof v !== "function") subState[k] = v;
      }
      return { affected: 1 };
    }),
  };

  const qr = {
    connect: jest.fn(async () => {}),
    startTransaction: jest.fn(async () => {}),
    commitTransaction: jest.fn(async () => {}),
    rollbackTransaction: jest.fn(async () => {}),
    release: jest.fn(async () => {}),
    manager: {
      // Stateful enough for assertions: the commercials-half updates land on
      // the subscription fixture the same way a real transaction would.
      update: jest.fn(async (_target: any, criteria: any, partial: any) => {
        if (
          criteria?.id === subState.id ||
          (criteria?.tenant_id && criteria.tenant_id === subState.tenant_id)
        ) {
          for (const [k, v] of Object.entries(partial as any)) {
            if (typeof v !== "function") subState[k] = v;
          }
        }
        return { affected: 1 };
      }),
    },
  };

  const tenantService = {
    ensureTenantProvisioned:
      opts?.ensure ??
      jest.fn().mockResolvedValue({ tenant: { tenant_id: "t-1" } }),
    createTenant: jest.fn(),
  };

  const emailService = new Proxy(
    {},
    { get: () => jest.fn().mockResolvedValue(undefined) },
  );

  const service = new BillingService(
    subscriptionRepository as any,
    { findOne: jest.fn().mockResolvedValue(null) } as any, // invoiceRepository
    {} as any, // tenantRepository
    {} as any, // paymentService
    tenantService as any,
    {} as any, // invitationService
    {} as any, // currencyService
    emailService as any,
    webhookService,
    { get: jest.fn() } as any, // configService
    { createQueryRunner: () => qr } as any, // dataSource
    {} as any, // objectStorage
  );

  return {
    service,
    ledger,
    subscriptionRepository,
    subState,
    tenantService,
    qr,
  };
}

const rawFor = (ev: any) => JSON.stringify(ev);
const signFor = (raw: string) =>
  crypto.createHmac("sha512", SECRET).update(raw).digest("hex");

const paystackEvent = (over: any = {}) => ({
  event: "charge.success",
  data: {
    id: "evt-900",
    reference: "ref-1",
    metadata: { subscription_id: "sub-1" },
    ...over,
  },
});

describe("BillingService — at-least-once webhook fulfillment", () => {
  it("REGRESSION: pay OK → provisioning fails → ledger FAILED (re-claimable) → gateway retry SUCCEEDS", async () => {
    const boom = new Error("tenant migration exploded");
    const ensure = jest
      .fn()
      .mockRejectedValueOnce(boom)
      .mockResolvedValueOnce({ tenant: { tenant_id: "t-1" } });
    const { service, ledger, subState } = makeBilling({ ensure });

    const ev = paystackEvent();
    const raw = rawFor(ev);
    const sig = signFor(raw);

    // Attempt 1: payment is captured, provisioning explodes.
    await expect(
      service.handlePaystackWebhook(raw, sig),
    ).rejects.toThrow("tenant migration exploded");

    const row = ledger.rows.get("evt-900");
    expect(row.status).toBe(WebhookFulfillmentStatus.FAILED);
    expect(row.attempts).toBe(1);
    expect(row.last_error).toContain("tenant migration exploded");
    // The defect: under the old contract this row existed too — but every
    // retry was dropped as a duplicate. Now FAILED stays re-claimable:
    expect(subState.provisioning_error).toContain(
      "tenant migration exploded",
    );

    // Attempt 2: the gateway retries the SAME signed payload.
    await expect(
      service.handlePaystackWebhook(raw, sig),
    ).resolves.toBeUndefined();

    const settled = ledger.rows.get("evt-900");
    expect(settled.status).toBe(WebhookFulfillmentStatus.FULFILLED);
    expect(settled.attempts).toBe(2); // re-claim, not duplicate drop
    expect(settled.subscription_id).toBe("sub-1");
    expect(settled.fulfilled_at).toBeInstanceOf(Date);
    expect(subState.status).toBe(SubscriptionStatus.ACTIVE);
    expect(subState.tenant_id).toBe("t-1");
    expect(subState.provisioning_error).toBeNull();
    expect(subState.provisioned_at).toBeInstanceOf(Date);

    // Third delivery: true duplicate now — dropped without fulfillment.
    await service.handlePaystackWebhook(raw, sig);
    expect(ledger.rows.get("evt-900").attempts).toBe(2);
  });

  it("terminal: actionable charge.success without subscription reference burns the cap and stops retries", async () => {
    const { service, ledger, tenantService } = makeBilling();
    const ev = {
      event: "charge.success",
      data: { id: "evt-noid", reference: "r" },
    };
    const raw = rawFor(ev);
    const sig = signFor(raw);

    // Resolves (200 to the gateway — retrying the identical payload is useless)
    await expect(
      service.handlePaystackWebhook(raw, sig),
    ).resolves.toBeUndefined();

    const row = ledger.rows.get("evt-noid");
    expect(row.status).toBe(WebhookFulfillmentStatus.FAILED);
    expect(row.attempts).toBe(MAX_FULFILLMENT_ATTEMPTS);
    expect(row.last_error).toContain("no subscription reference");
    expect(tenantService.ensureTenantProvisioned).not.toHaveBeenCalled();

    // A gateway retry is dropped as exhausted — no attempt churn.
    await service.handlePaystackWebhook(raw, sig);
    expect(ledger.rows.get("evt-noid").attempts).toBe(MAX_FULFILLMENT_ATTEMPTS);
  });

  it("terminal: unknown subscription id fails terminally without touching any tenant", async () => {
    const { service, ledger, tenantService } = makeBilling();
    const ev = paystackEvent({
      id: "evt-ghost",
      metadata: { subscription_id: "sub-does-not-exist" },
    });
    const raw = rawFor(ev);
    await expect(
      service.handlePaystackWebhook(raw, signFor(raw)),
    ).resolves.toBeUndefined();

    const row = ledger.rows.get("evt-ghost");
    expect(row.status).toBe(WebhookFulfillmentStatus.FAILED);
    expect(row.attempts).toBe(MAX_FULFILLMENT_ATTEMPTS);
    expect(row.last_error).toContain("not found");
    expect(tenantService.ensureTenantProvisioned).not.toHaveBeenCalled();
  });

  it("non-actionable events settle as FULFILLED no-ops so redeliveries dedupe cleanly", async () => {
    const { service, ledger, tenantService } = makeBilling();
    const ev = { event: "charge.pending", data: { id: "evt-pend" } };
    const raw = rawFor(ev);
    await expect(
      service.handlePaystackWebhook(raw, signFor(raw)),
    ).resolves.toBeUndefined();

    const row = ledger.rows.get("evt-pend");
    expect(row.status).toBe(WebhookFulfillmentStatus.FULFILLED);
    expect(row.subscription_id).toBeUndefined();
    expect(tenantService.ensureTenantProvisioned).not.toHaveBeenCalled();
  });

  it("idempotent replay: already-ACTIVE subscription with tenant short-circuits fulfillment", async () => {
    const sub = pendingSub({
      status: SubscriptionStatus.ACTIVE,
      tenant_id: "t-9",
      provisioned_at: new Date(),
    });
    const { service, ledger, tenantService } = makeBilling({ sub });
    const ev = paystackEvent({ id: "evt-active" });
    const raw = rawFor(ev);
    await expect(
      service.handlePaystackWebhook(raw, signFor(raw)),
    ).resolves.toBeUndefined();

    expect(ledger.rows.get("evt-active").status).toBe(
      WebhookFulfillmentStatus.FULFILLED,
    );
    expect(tenantService.ensureTenantProvisioned).not.toHaveBeenCalled();
  });

  it("PayPal capture events flow through the same claim → fulfill → settle path", async () => {
    const { service, ledger, subState } = makeBilling();
    const body = {
      id: "WH-55",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { custom_id: "sub-1", id: "CAP-77" },
    };
    const headers = {
      transmissionId: "tx-9",
      transmissionTime: new Date().toISOString(),
      certUrl: "https://api.sandbox.paypal.com/certs/cert.pem",
      authAlgo: "SHA256withRSA",
      transmissionSig: "sig",
    };
    await expect(
      service.handlePaypalWebhook(body, headers),
    ).resolves.toBeUndefined();

    const row = ledger.rows.get("WH-55");
    expect(row.provider).toBe("paypal");
    expect(row.status).toBe(WebhookFulfillmentStatus.FULFILLED);
    expect(row.subscription_id).toBe("sub-1");
    expect(subState.status).toBe(SubscriptionStatus.ACTIVE);
    // capture id recorded as the gateway reference
    expect(subState.gateway_reference).toBe("CAP-77");
  });

  it("replayFulfillment throws TerminalFulfillmentError for unattributable payments (cron contract)", async () => {
    const { service } = makeBilling();
    await expect(
      service.replayFulfillment({
        provider: "paystack",
        payload: { event: "charge.success", data: { id: "x" } },
      }),
    ).rejects.toBeInstanceOf(TerminalFulfillmentError);
    await expect(
      service.replayFulfillment({
        provider: "paystack",
        payload: { event: "charge.pending", data: { id: "y" } },
      }),
    ).resolves.toBeNull();
  });
});
