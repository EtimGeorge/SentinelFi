import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { BillingService } from "./billing.service";
import { Public } from "../common/decorators/public.decorator";
import { Request } from "express";

/**
 * Receives asynchronous payment confirmations from Paystack and PayPal.
 * These endpoints MUST be:
 *   1. Public (@Public()) — no JWT required, the gateway calls these without auth
 *   2. Using raw body — Paystack HMAC verification requires the raw request body
 *
 * In production, provide these URLs to your gateway dashboard:
 *   Paystack: POST https://api.sentinelfi.com/billing/webhook/paystack
 *   PayPal:   POST https://api.sentinelfi.com/billing/webhook/paypal
 */
@Controller("billing/webhook")
export class WebhookController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Paystack webhook handler.
   * Paystack signs events with HMAC-SHA512 using your PAYSTACK_SECRET_KEY.
   * We verify the signature before processing any event.
   */
  @Public()
  @Post("paystack")
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Headers("x-paystack-signature") signature: string,
    @Req() req: Request,
  ) {
    // req.rawBody is populated by the rawBody middleware registered in main.ts
    const rawBody = (req as any).rawBody as string;

    if (!rawBody) {
      // Defensive: if rawBody middleware is not set up, fall back to stringified body
      const fallback = JSON.stringify(req.body);
      await this.billingService.handlePaystackWebhook(fallback, signature);
    } else {
      await this.billingService.handlePaystackWebhook(rawBody, signature);
    }

    // Always return 200 quickly — Paystack retries on non-200 responses
    return { received: true };
  }

  /**
   * PayPal webhook handler.
   * PayPal sends PAYMENT.CAPTURE.COMPLETED events with transmission headers.
   * We verify the webhook signature via PayPal verify API when credentials are configured,
   * otherwise we at least require the transmission headers (fail-closed for forgeries).
   */
  @Public()
  @Post("paypal")
  @HttpCode(HttpStatus.OK)
  async paypalWebhook(
    @Headers("paypal-transmission-id") transmissionId: string,
    @Headers("paypal-transmission-time") transmissionTime: string,
    @Headers("paypal-cert-url") certUrl: string,
    @Headers("paypal-auth-algo") authAlgo: string,
    @Headers("paypal-transmission-sig") transmissionSig: string,
    @Req() req: Request,
  ) {
    const rawBody = (req as any).rawBody as string | undefined;
    // Pass headers + rawBody to billing service for verification (idempotency + signature)
    await this.billingService.handlePaypalWebhook(req.body, {
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      rawBody,
    });
    return { received: true };
  }
}
