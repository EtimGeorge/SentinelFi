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
   */
  async verifyPaystack(rawBody: string, signature: string): Promise<boolean> {
    const secret = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    if (!secret) {
      this.logger.error("PAYSTACK_SECRET_KEY not configured.");
      throw new InternalServerErrorException("Payment configuration error.");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      this.logger.warn("Paystack signature mismatch.");
      throw new ForbiddenException("Invalid signature");
    }

    const event = JSON.parse(rawBody);
    const eventId = event.data?.id || event.id; // Paystack unique event ID

    return this.isNewEvent(eventId, "paystack", event);
  }

  /**
   * Verifies PayPal webhook signature (when credentials are configured) and checks idempotency.
   * Requires PAYPAL_WEBHOOK_ID + PAYPAL_CLIENT_ID/SECRET for full verification; otherwise requires transmission headers.
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
    await this.processedWebhookRepository.save(processed);

    return true;
  }
}
