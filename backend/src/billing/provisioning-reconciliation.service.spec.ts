import { ProvisioningReconciliationService } from "./provisioning-reconciliation.service";
import { TerminalFulfillmentError } from "./billing.service";
import {
  WebhookFulfillmentStatus,
  ProcessedWebhookEntity,
} from "./entities/processed-webhook.entity";

function makeRow(over: Partial<ProcessedWebhookEntity> = {}) {
  return {
    id: "row-1",
    gateway_event_id: "evt-1",
    provider: "paystack",
    payload: { event: "charge.success", data: { id: "evt-1" } },
    status: WebhookFulfillmentStatus.FAILED,
    attempts: 2,
    claimed_at: new Date(Date.now() - 60 * 60 * 1000),
    last_error: "migration exploded",
    subscription_id: null,
    tenant_id: null,
    processed_at: new Date(),
    fulfilled_at: null,
    ...over,
  } as ProcessedWebhookEntity;
}

describe("ProvisioningReconciliationService", () => {
  function makeSut(opts?: {
    replayable?: ProcessedWebhookEntity[];
    reclaim?: jest.Mock;
    fulfill?: jest.Mock;
    stuckCount?: number;
  }) {
    const webhookService = {
      findReplayable: jest
        .fn()
        .mockResolvedValue(opts?.replayable ?? []),
      reclaimForReplay: opts?.reclaim ?? jest.fn().mockResolvedValue(true),
      markFulfilled: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const billingService = {
      replayFulfillment:
        opts?.fulfill ?? jest.fn().mockResolvedValue("sub-1"),
    };
    const subscriptionRepository = {
      count: jest.fn().mockResolvedValue(opts?.stuckCount ?? 0),
    };
    const sut = new ProvisioningReconciliationService(
      subscriptionRepository as any,
      webhookService as any,
      billingService as any,
    );
    return { sut, webhookService, billingService, subscriptionRepository };
  }

  it("replays a FAILED row: reclaim (CAS) → fulfill → markFulfilled with the subscription ref", async () => {
    const row = makeRow();
    const { sut, webhookService, billingService } = makeSut({
      replayable: [row],
    });

    const result = await sut.replayFailedWebhooks();

    expect(webhookService.reclaimForReplay).toHaveBeenCalledWith(row);
    expect(billingService.replayFulfillment).toHaveBeenCalledWith(row);
    expect(webhookService.markFulfilled).toHaveBeenCalledWith("row-1", {
      subscriptionId: "sub-1",
    });
    expect(webhookService.markFailed).not.toHaveBeenCalled();
    expect(result).toEqual({ replayed: 1, succeeded: 1, failed: 0 });
  });

  it("does NOT replay when a concurrent gateway retry already reclaimed the row (CAS lost)", async () => {
    const row = makeRow();
    const { sut, billingService } = makeSut({
      replayable: [row],
      reclaim: jest.fn().mockResolvedValue(false),
    });

    await sut.replayFailedWebhooks();

    expect(billingService.replayFulfillment).not.toHaveBeenCalled();
  });

  it("marks retryable replay failures FAILED without burning the cap", async () => {
    const row = makeRow();
    const { sut, webhookService, billingService } = makeSut({
      replayable: [row],
      fulfill: jest.fn().mockRejectedValue(new Error("db hiccup")),
    });

    const result = await sut.replayFailedWebhooks();

    expect(webhookService.markFailed).toHaveBeenCalledWith(
      "row-1",
      "db hiccup",
      { terminal: false },
    );
    expect(result).toEqual({ replayed: 1, succeeded: 0, failed: 1 });
  });

  it("marks terminal replay failures with terminal=true (cap burned, escalation surface)", async () => {
    const row = makeRow();
    const { sut, webhookService } = makeSut({
      replayable: [row],
      fulfill: jest
        .fn()
        .mockRejectedValue(new TerminalFulfillmentError("unattributable")),
    });

    await sut.replayFailedWebhooks();

    expect(webhookService.markFailed).toHaveBeenCalledWith(
      "row-1",
      "unattributable",
      { terminal: true },
    );
  });

  it("one broken row does not abort the batch", async () => {
    const rows = [
      makeRow({ id: "r-a", gateway_event_id: "evt-a" }),
      makeRow({ id: "r-b", gateway_event_id: "evt-b" }),
    ];
    let calls = 0;
    const { sut, webhookService } = makeSut({
      replayable: rows,
      fulfill: jest
        .fn()
        .mockRejectedValueOnce(new Error("first fails"))
        .mockResolvedValueOnce("sub-2"),
    });

    const result = await sut.replayFailedWebhooks();

    expect(calls + result.succeeded).toBe(1); // second row still fulfilled
    expect(result.failed).toBe(1);
    expect(webhookService.markFailed).toHaveBeenCalledTimes(1);
    expect(webhookService.markFulfilled).toHaveBeenCalledWith("r-b", {
      subscriptionId: "sub-2",
    });
  });

  it("escalates paid-but-unprovisioned subscriptions when the count is non-zero", async () => {
    const { sut, subscriptionRepository } = makeSut({ stuckCount: 3 });
    await expect(sut.escalateUnprovisionedPaid()).resolves.toBeUndefined();
    expect(subscriptionRepository.count).toHaveBeenCalledTimes(1);
  });
});
