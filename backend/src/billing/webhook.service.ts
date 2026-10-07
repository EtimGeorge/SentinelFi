import {
  Injectable,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { ProcessedWebhookEntity } from "./entities/processed-webhook.entity";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProcessedWebhookEntity)
    private readonly processedWebhookRepository: Repository<ProcessedWebhookEntity>,
  ) {}

  /**
   * Verifies Paystack signature and checks for idempotency.
   *
   * SEC-2026-002: was `hash !== signature` (early-exit string compare leaks
   * the HMAC byte-by-byte to a timing oracle). Now timingSafeEqual over
   * fixed-length hex buffers; fail-closed on missing/empty signature and on
   * malformed JSON (a 500 here would turn forgeries into retryable errors).
   */
  async verifyPaystack(rawBody: string, signature: string): Promise<boolean> {
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

    return this.isNewEvent(eventId, "paystack", event);
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
  ): Promise<boolean> {
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

    return this.isNewEvent(eventId, "paypal", body);
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

  private async isNewEvent(
    eventId: string,
    provider: string,
    payload: any,
  ): Promise<boolean> {
    const existing = await this.processedWebhookRepository.findOne({
      where: { gateway_event_id: eventId },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate webhook received from ${provider}: ${eventId}. Skipping.`,
      );
      return false;
    }

    const processed = this.processedWebhookRepository.create({
      gateway_event_id: eventId,
      provider,
      payload,
    });
    try {
      await this.processedWebhookRepository.save(processed);
    } catch (err: any) {
      // TOCTOU race: two concurrent deliveries of the same event can both
      // pass the findOne above; the UNIQUE index on gateway_event_id makes
      // exactly one winner. Treat the loser's constraint violation as a
      // duplicate (return false → no fulfillment), NOT a 500 — a 500 would
      // tell the gateway to retry and amplify the storm.
      const code = err?.code ?? err?.errno ?? "";
      const msg = String(err?.message ?? "");
      const isUniqueViolation =
        code === "23505" || // Postgres unique_violation
        code === "ER_DUP_ENTRY" ||
        code === 1062 || // MySQL duplicate entry
        /unique|duplicate/i.test(msg);
      if (isUniqueViolation) {
        this.logger.warn(
          `Concurrent duplicate webhook from ${provider}: ${eventId} lost the insert race. Skipping.`,
        );
        return false;
      }
      throw err;
    }

    return true;
  }
}
