import {
  Injectable,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import * as crypto from "crypto";
import {
  ProcessedWebhookEntity,
  WebhookFulfillmentStatus,
} from "./entities/processed-webhook.entity";

/**
 * A PROCESSING claim older than this is presumed dead (worker killed mid-run)
 * and may be taken over by a retry or the reconciliation cron. Must exceed
 * worst-case fulfillment (~3-min tenant migration set + headroom) so a live
 * worker is never raced.
 */
export const WEBHOOK_CLAIM_STALE_MS = 10 * 60 * 1000;

/** Hard cap on fulfillment attempts per event (gateway retries + cron share it). */
export const MAX_FULFILLMENT_ATTEMPTS = 10;

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProcessedWebhookEntity)
    private readonly processedWebhookRepository: Repository<ProcessedWebhookEntity>,
  ) {}

  /**
   * Verifies the Paystack signature and returns the PARSED event.
   * Verification only — no ledger write here: idempotency and fulfillment
   * bookkeeping happen in claimEvent() AFTER this succeeds. (Writing the
   * ledger before fulfillment was the at-most-once defect: a fulfillment
   * failure was deduped away on every gateway retry.)
   *
   * SEC-2026-002: was `hash !== signature` (early-exit string compare leaks
   * the HMAC byte-by-byte to a timing oracle). Now timingSafeEqual over
   * fixed-length hex buffers; fail-closed on missing/empty signature and on
   * malformed JSON (a 500 here would turn forgeries into retryable errors).
   */
  async verifyPaystack(rawBody: string, signature: string): Promise<any> {
    const secret = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    if (!secret) {
      this.logger.error("PAYSTACK_SECRET_KEY not configured.");
      throw new InternalServerErrorException("Payment configuration error.");
    }

    if (!signature || typeof signature !== "string") {
      this.logger.warn("Paystack webhook missing signature — rejecting.");
      throw new ForbiddenException("Missing signature");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    const a = Buffer.from(hash, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    const match =
      a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!match) {
      this.logger.warn("Paystack signature mismatch.");
      throw new ForbiddenException("Invalid signature");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      this.logger.warn("Paystack webhook body is not valid JSON — rejecting.");
      throw new ForbiddenException("Invalid webhook payload");
    }
    const eventId = event.data?.id || event.id; // Paystack unique event ID
    if (!eventId) {
      this.logger.warn("Paystack webhook missing event id — rejecting.");
      throw new ForbiddenException("Invalid webhook payload");
    }

    // Verification ONLY — the caller claims the event via claimEvent().
    return event;
  }

  /**
   * Verifies PayPal webhook signature (when credentials are configured) and checks idempotency.
   * Requires PAYPAL_WEBHOOK_ID + PAYPAL_CLIENT_ID/SECRET for full verification; otherwise requires transmission headers.
   *
   * SEC-2026-003 (fail-closed hardening, this edit):
   *   1. `certUrl` was accepted verbatim and forwarded into PayPal's
   *      verify-webhook-signature body. A forged webhook could smuggle an
   *      attacker-controlled `certUrl` (internal host, file://, weird port)
   *      into an outbound server-side call — an SSRF-shaped primitive even
   *      though the destination here is PayPal's API (the value still shapes
   *      a server-side request body). Now: strict allowlist — must be an
   *      https: URL on api[.sandbox].paypal.com with no credentials,
   *      no non-default port, no control characters. Anything else → 403.
   *   2. `transmissionTime` was never validated: an attacker could replay a
   *      once-valid header set forever. Now: must parse to a real date
   *      within ±15 minutes of server time (PayPal docs recommend checking
   *      freshness; 15 min tolerates clock skew without opening a wide
   *      replay window). Outside the window → 403.
   *   3. `authAlgo` was never validated: now must be SHA256withRSA or
   *      SHA256-RSA (the only algorithms PayPal emits for webhooks).
   *      Anything else → 403, so a downgrade-shaped forgery cannot pass
   *      the header-presence check in dev/unconfigured mode.
   */
  async verifyPaypal(
    body: any,
    headers?: {
      transmissionId?: string;
      transmissionTime?: string;
      certUrl?: string;
      authAlgo?: string;
      transmissionSig?: string;
      rawBody?: string;
    },
  ): Promise<void> {
    const eventId = body.id; // PayPal unique event ID
    if (!eventId) {
      this.logger.warn("PayPal webhook missing event id — rejecting.");
      throw new ForbiddenException("Invalid PayPal webhook payload");
    }

    // Require PayPal transmission headers — fail-closed for forgeries
    const { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig } = headers ?? {};
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      this.logger.warn("PayPal webhook missing transmission signature headers — rejecting.");
      throw new ForbiddenException("Missing PayPal signature headers");
    }

    this.assertPaypalHeadersFreshAndWellFormed(
      transmissionTime,
      certUrl,
      authAlgo,
    );

    // If PayPal credentials are configured, verify via PayPal API
    const webhookId = this.configService.get<string>("PAYPAL_WEBHOOK_ID");
    const clientId = this.configService.get<string>("PAYPAL_CLIENT_ID");
    const clientSecret = this.configService.get<string>("PAYPAL_CLIENT_SECRET");
    const paypalEnv = this.configService.get<string>("PAYPAL_ENV") ?? "sandbox";
    if (webhookId && clientId && clientSecret) {
      const verified = await this.verifyPaypalSignatureViaApi(
        body,
        { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
        webhookId,
        clientId,
        clientSecret,
        paypalEnv,
      );
      if (!verified) {
        this.logger.warn("PayPal webhook signature verification failed.");
        throw new ForbiddenException("Invalid PayPal signature");
      }
    } else {
      this.logger.warn(
        "PAYPAL_WEBHOOK_ID/CLIENT not configured — skipping remote signature verification (headers presence only). Configure for full verification in production.",
      );
    }

    // Verification ONLY — fulfillment idempotency is claimEvent()'s job now
    // (the ledger write used to live here, before fulfillment — the defect).
  }

  private async verifyPaypalSignatureViaApi(
    body: any,
    headers: { transmissionId: string; transmissionTime: string; certUrl: string; authAlgo: string; transmissionSig: string },
    webhookId: string,
    clientId: string,
    clientSecret: string,
    env: string,
  ): Promise<boolean> {
    try {
      const baseUrl = env === "live" ? "https://api.paypal.com" : "https://api.sandbox.paypal.com";
      // 1. Get access token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      } as any);
      if (!tokenRes.ok) {
        this.logger.error(`PayPal token fetch failed: ${tokenRes.status}`);
        return false;
      }
      const tokenData = (await tokenRes.json()) as any;
      const accessToken = tokenData.access_token;
      if (!accessToken) return false;

      // 2. Verify signature
      const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: headers.transmissionId,
          transmission_time: headers.transmissionTime,
          cert_id: headers.certUrl,
          auth_algo: headers.authAlgo,
          transmission_sig: headers.transmissionSig,
          webhook_id: webhookId,
          webhook_event: body,
        }),
      } as any);
      if (!verifyRes.ok) {
        this.logger.error(`PayPal verify call failed: ${verifyRes.status}`);
        return false;
      }
      const verifyData = (await verifyRes.json()) as any;
      return verifyData.verification_status === "SUCCESS";
    } catch (err: any) {
      this.logger.error(`PayPal signature verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * SEC-2026-003: fail-closed shape/freshness checks for PayPal transmission
   * headers. Runs BEFORE any remote verify call and BEFORE idempotency, so a
   * malformed or stale forgery is rejected without a network round-trip and
   * without polluting the idempotency store (which would turn forgeries into
   * a `gateway_event_id` squatting primitive — attacker pre-registers the id,
   * legitimate event later reads "duplicate" and is skipped).
   */
  private assertPaypalHeadersFreshAndWellFormed(
    transmissionTime: string,
    certUrl: string,
    authAlgo: string,
  ): void {
    // 1. authAlgo allowlist — PayPal only emits SHA256withRSA for webhooks
    //    (SHA256-RSA accepted as a known alias spelling).
    const normalizedAlgo = authAlgo.trim();
    if (normalizedAlgo !== "SHA256withRSA" && normalizedAlgo !== "SHA256-RSA") {
      this.logger.warn(
        `PayPal webhook has unexpected auth_algo "${authAlgo}" — rejecting.`,
      );
      throw new ForbiddenException("Invalid PayPal signature algorithm");
    }

    // 2. certUrl allowlist — https-only, PayPal API hosts only, no userinfo,
    //    no explicit port, no control characters. Rejects file://, http://,
    //    internal hostnames, and credential-smuggling shapes.
    let parsed: URL;
    try {
      if (/[\u0000-\u001f\u007f]/.test(certUrl)) throw new Error("control chars");
      parsed = new URL(certUrl);
    } catch {
      this.logger.warn("PayPal webhook has malformed cert_url — rejecting.");
      throw new ForbiddenException("Invalid PayPal certificate URL");
    }
    const hostOk =
      parsed.protocol === "https:" &&
      (parsed.hostname === "api.paypal.com" ||
        parsed.hostname === "api.sandbox.paypal.com") &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port;
    if (!hostOk) {
      this.logger.warn(
        `PayPal webhook cert_url not allowlisted ("${parsed.protocol}//${parsed.hostname}") — rejecting.`,
      );
      throw new ForbiddenException("Invalid PayPal certificate URL");
    }

    // 3. transmissionTime freshness — must be a real date within ±15 min of
    //    now. Kills indefinite replay of a once-valid header set.
    const txTime = Date.parse(transmissionTime);
    if (Number.isNaN(txTime)) {
      this.logger.warn("PayPal webhook has unparseable transmission_time — rejecting.");
      throw new ForbiddenException("Invalid PayPal transmission time");
    }
    const skewMs = Math.abs(Date.now() - txTime);
    const MAX_SKEW_MS = 15 * 60 * 1000;
    if (skewMs > MAX_SKEW_MS) {
      this.logger.warn(
        `PayPal webhook transmission_time outside ±15min window (skew=${Math.round(skewMs / 1000)}s) — rejecting.`,
      );
      throw new ForbiddenException("Stale PayPal webhook");
    }
  }

  // ─── CLAIM STATE MACHINE (at-least-once fulfillment) ─────────────────────────

  /**
   * Claims an event for fulfillment. Called AFTER signature verification.
   *
   * Replaces the old find-then-insert dedupe, which wrote the ledger BEFORE
   * fulfillment: if fulfillment then threw, the row still existed and every
   * gateway retry was dropped as a "duplicate" — a paid tenant whose
   * provisioning failed was permanently lost (at-most-once, invisible).
   *
   * claimEvent() inserts PROCESSING and:
   *   - drops true duplicates (FULFILLED) and in-flight work (fresh PROCESSING)
   *   - RE-CLAIMS FAILED rows and stale PROCESSING claims (dead worker) until
   *     MAX_FULFILLMENT_ATTEMPTS is reached
   * so gateway retries and the reconciliation cron replay real failures —
   * at-least-once, with a hard attempt cap and full visibility (last_error).
   */
  async claimEvent(
    eventId: string,
    provider: string,
    payload: any,
  ): Promise<ClaimOutcome> {
    if (!eventId) {
      throw new Error("claimEvent requires a gateway_event_id");
    }
    const now = new Date();
    try {
      const inserted = await this.processedWebhookRepository.insert({
        gateway_event_id: eventId,
        provider,
        payload,
        status: WebhookFulfillmentStatus.PROCESSING,
        attempts: 1,
        claimed_at: now,
      });
      return { claimed: true, recordId: inserted.identifiers[0].id as string };
    } catch (err: any) {
      if (!this.isUniqueViolation(err)) throw err;
      // TOCTOU: concurrent delivery of the same event — the UNIQUE index made
      // exactly one winner. The loser inspects the winner's row below.
    }

    const row = await this.processedWebhookRepository.findOne({
      where: { gateway_event_id: eventId },
    });
    if (!row) {
      // Row vanished between our failed insert and this read (rare purge
      // race). Treat as in-flight; redelivery will claim cleanly.
      return { claimed: false, reason: "in_flight" };
    }

    if (row.status === WebhookFulfillmentStatus.FULFILLED) {
      this.logger.warn(
        `Duplicate webhook from ${provider}: ${eventId} already fulfilled. Dropping.`,
      );
      return { claimed: false, reason: "duplicate" };
    }

    const claimAgeMs = row.claimed_at
      ? Date.now() - new Date(row.claimed_at).getTime()
      : Number.POSITIVE_INFINITY;
    if (
      row.status === WebhookFulfillmentStatus.PROCESSING &&
      claimAgeMs < WEBHOOK_CLAIM_STALE_MS
    ) {
      this.logger.warn(
        `Webhook ${eventId} in flight (claimed ${Math.round(claimAgeMs / 1000)}s ago). Dropping duplicate delivery.`,
      );
      return { claimed: false, reason: "in_flight" };
    }

    if (row.attempts >= MAX_FULFILLMENT_ATTEMPTS) {
      this.logger.error(
        `Webhook ${eventId} exhausted ${row.attempts} fulfillment attempts — not re-claiming. last_error: ${row.last_error ?? "n/a"}`,
      );
      return { claimed: false, reason: "exhausted" };
    }

    // CAS re-claim of FAILED or stale PROCESSING: optimistic lock on the
    // observed (status, attempts) so exactly one concurrent worker wins.
    const takeover = await this.processedWebhookRepository.update(
      { id: row.id, status: row.status, attempts: row.attempts },
      {
        status: WebhookFulfillmentStatus.PROCESSING,
        attempts: row.attempts + 1,
        claimed_at: now,
        last_error: null,
      },
    );
    if (takeover.affected === 1) {
      this.logger.warn(
        `Re-claimed webhook ${eventId} (${row.status}, attempt ${row.attempts + 1}/${MAX_FULFILLMENT_ATTEMPTS}).`,
      );
      return { claimed: true, recordId: row.id };
    }
    return { claimed: false, reason: "in_flight" };
  }

  /** Settles a claim as FULFILLED. Only the live PROCESSING claim may settle. */
  async markFulfilled(
    recordId: string,
    refs: { subscriptionId?: string; tenantId?: string } = {},
  ): Promise<void> {
    const res = await this.processedWebhookRepository.update(
      { id: recordId, status: WebhookFulfillmentStatus.PROCESSING },
      {
        status: WebhookFulfillmentStatus.FULFILLED,
        fulfilled_at: new Date(),
        last_error: null,
        ...(refs.subscriptionId
          ? { subscription_id: refs.subscriptionId }
          : {}),
        ...(refs.tenantId ? { tenant_id: refs.tenantId } : {}),
      },
    );
    if (res.affected !== 1) {
      this.logger.warn(
        `markFulfilled: claim ${recordId} no longer PROCESSING (taken over?) — skip.`,
      );
    }
  }

  /**
   * Settles a claim as FAILED with the error recorded. Retryable failures stay
   * re-claimable (attempts < cap) for gateway retries + the cron. Terminal
   * failures (`terminal: true` — replaying the identical payload can never
   * succeed, e.g. missing subscription reference) burn the attempt cap
   * immediately so retries stop, while the row stays visible in the superadmin
   * provisioning-exceptions view.
   */
  async markFailed(
    recordId: string,
    error: string,
    opts: { terminal?: boolean } = {},
  ): Promise<void> {
    const message = (error || "unknown error").slice(0, 2000);
    const res = await this.processedWebhookRepository.update(
      { id: recordId, status: WebhookFulfillmentStatus.PROCESSING },
      {
        status: WebhookFulfillmentStatus.FAILED,
        last_error: message,
        ...(opts.terminal ? { attempts: MAX_FULFILLMENT_ATTEMPTS } : {}),
      },
    );
    if (res.affected !== 1) {
      this.logger.warn(
        `markFailed: claim ${recordId} no longer PROCESSING (taken over?) — skip.`,
      );
    }
  }

  /**
   * FAILED rows under the attempt cap, plus PROCESSING claims whose worker
   * died (claimed_at older than WEBHOOK_CLAIM_STALE_MS). Both are safe to
   * replay: reclaim is a CAS, so a live concurrent worker still wins.
   */
  async findReplayable(take = 25): Promise<ProcessedWebhookEntity[]> {
    const staleBefore = new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS);
    return this.processedWebhookRepository.find({
      where: [
        {
          status: WebhookFulfillmentStatus.FAILED,
          attempts: LessThan(MAX_FULFILLMENT_ATTEMPTS),
        },
        {
          status: WebhookFulfillmentStatus.PROCESSING,
          attempts: LessThan(MAX_FULFILLMENT_ATTEMPTS),
          claimed_at: LessThan(staleBefore),
        },
      ],
      order: { processed_at: "ASC" },
      take,
    });
  }

  /**
   * Every broken row for the superadmin provisioning-exceptions view —
   * includes exhausted FAILED rows and dead PROCESSING claims (no attempt
   * filter: the admin needs to see the stuck ones the cron stopped retrying).
   */
  async findFulfillmentExceptions(take = 50): Promise<ProcessedWebhookEntity[]> {
    const staleBefore = new Date(Date.now() - WEBHOOK_CLAIM_STALE_MS);
    return this.processedWebhookRepository.find({
      where: [
        { status: WebhookFulfillmentStatus.FAILED },
        {
          status: WebhookFulfillmentStatus.PROCESSING,
          claimed_at: LessThan(staleBefore),
        },
      ],
      order: { processed_at: "DESC" },
      take,
    });
  }

  /**
   * CAS re-claim used by the reconciliation cron on a row it already filtered
   * as replayable. Optimistic lock on the (status, attempts) the cron read, so
   * a concurrent gateway retry that already took the row makes this a no-op.
   */
  async reclaimForReplay(row: ProcessedWebhookEntity): Promise<boolean> {
    const res = await this.processedWebhookRepository.update(
      { id: row.id, status: row.status, attempts: row.attempts },
      {
        status: WebhookFulfillmentStatus.PROCESSING,
        attempts: row.attempts + 1,
        claimed_at: new Date(),
        last_error: null,
      },
    );
    return res.affected === 1;
  }

  /** Single ledger row by id — superadmin console lookups (replay action). */
  async findOneById(id: string): Promise<ProcessedWebhookEntity | null> {
    return this.processedWebhookRepository.findOne({ where: { id } });
  }

  /**
   * CAS re-claim for the SUPERADMIN manual-replay action. Same optimistic
   * lock as reclaimForReplay; `resetAttempts` burns a fresh attempt budget
   * for exhausted rows (attempts >= cap) after the admin investigated —
   * deliberate human override of the automatic retry ceiling.
   */
  async adminReclaimForReplay(
    row: ProcessedWebhookEntity,
    opts: { resetAttempts?: boolean } = {},
  ): Promise<boolean> {
    const res = await this.processedWebhookRepository.update(
      { id: row.id, status: row.status, attempts: row.attempts },
      {
        status: WebhookFulfillmentStatus.PROCESSING,
        attempts: opts.resetAttempts ? 1 : row.attempts + 1,
        claimed_at: new Date(),
        last_error: null,
      },
    );
    if (res.affected === 1 && opts.resetAttempts) {
      this.logger.warn(
        `Admin replay reset the attempt budget for webhook ${row.gateway_event_id} (was ${row.attempts}/${MAX_FULFILLMENT_ATTEMPTS}).`,
      );
    }
    return res.affected === 1;
  }

  /** Shared unique-violation check (TOCTOU races on the ledger insert). */
  private isUniqueViolation(err: any): boolean {
    const code = err?.code ?? err?.errno ?? err?.driverError?.code ?? "";
    const msg = String(err?.message ?? "");
    return (
      code === "23505" || // Postgres unique_violation
      code === "ER_DUP_ENTRY" ||
      code === 1062 || // MySQL duplicate entry
      /unique|duplicate/i.test(msg)
    );
  }
}

/** Result of claimEvent — `claimed: false` means drop the delivery (200 to gateway). */
export type ClaimOutcome =
  | { claimed: true; recordId: string }
  | { claimed: false; reason: "duplicate" | "in_flight" | "exhausted" };
