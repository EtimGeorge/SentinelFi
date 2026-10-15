import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingCycle } from "./entities/subscription.entity";
import { PaymentProvider } from "../payment/interfaces/payment-strategy.interface";
import { Role } from "@shared/types/role.enum";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../common/decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("billing")
export class SubscriptionController {
  constructor(private readonly billingService: BillingService) {}

  // ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

  /**
   * Start a free 14-day trial. No payment required.
   * Creates tenant immediately and dispatches magic-link.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("start-trial")
  @HttpCode(HttpStatus.CREATED)
  async startTrial(
    @Body()
    body: {
      email: string;
      companyName: string;
      firstName: string;
      lastName: string;
    },
  ) {
    return this.billingService.startFreeTrial(body);
  }

  /**
   * Start the perpetual free plan (1 task/day, ad-supported).
   * No payment, no expiry. Welcome email via Resend + magic-link.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("start-free")
  @HttpCode(HttpStatus.CREATED)
  async startFree(
    @Body()
    body: {
      email: string;
      companyName: string;
      firstName: string;
      lastName: string;
    },
  ) {
    return this.billingService.startFreePlan(body);
  }

  /**
   * Initiate a paid subscription.
   * Returns a payment gateway URL. Tenant created ONLY after webhook confirms payment.
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("process-public-subscription")
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @Body()
    body: {
      email: string;
      companyName: string;
      firstName: string;
      lastName: string;
      plan: string;
      billingCycle: BillingCycle;
      gateway: PaymentProvider;
      baseCurrency?: string;
    },
  ) {
    return this.billingService.processPublicSubscription(body);
  }

  /**
   * Poll subscription status by ID (used by /billing/success page after checkout).
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get("subscription/status")
  async getSubscriptionStatus(@Query("ref") ref: string) {
    return this.billingService.getSubscriptionStatus(ref);
  }

  // ─── AUTHENTICATED USER ENDPOINTS ─────────────────────────────────────────

  /**
   * Get the authenticated user's subscription details.
   * Used by the subscription settings page and SubscriptionBanner component.
   */
  @Get("my-subscription")
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@Req() req: any) {
    return this.billingService.getMySubscription(req.user.tenant_id);
  }

  /**
   * SUPERADMIN: paid → provisioned exceptions.
   *  - failed_webhooks: gateway events whose fulfillment failed (the
   *    reconciliation cron auto-replays the retryable ones; exhausted or
   *    terminal rows need human action)
   *  - unprovisioned_paid: subscriptions that went to checkout >1h ago and
   *    are still PENDING (webhook may never have arrived)
   */
  @Get("provisioning-exceptions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  async getProvisioningExceptions() {
    return this.billingService.getProvisioningExceptions();
  }

  /**
   * SUPERADMIN action: replay one failed/stuck webhook ledger row NOW
   * (instead of waiting for the reconciliation cron). `force: true` resets
   * the attempt budget so exhausted rows can be revived after investigation.
   */
  @Post("provisioning/webhooks/:id/replay")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async replayWebhookEvent(
    @Param("id") id: string,
    @Body() body: { force?: boolean },
  ) {
    return this.billingService.adminReplayWebhook(id, {
      force: body?.force === true,
    });
  }

  /**
   * SUPERADMIN action: provision a paid-but-stuck subscription directly.
   * Only for PENDING subscriptions whose charge the admin has verified
   * against the gateway dashboard (the webhook may never have arrived).
   */
  @Post("provisioning/subscriptions/:id/provision")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  async provisionSubscriptionManually(@Param("id") id: string) {
    return this.billingService.adminProvisionSubscription(id);
  }

  /**
   * Invite a team member to the authenticated user's tenant.
   */
  @Post("invite")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AdminDirector, Role.SuperAdmin)
  async inviteTeamMember(
    @Body()
    body: { email: string; role: Role; firstName?: string; lastName?: string },
    @Req() req: any,
  ) {
    return this.billingService.inviteUser(
      body.email,
      body.role,
      req.user.tenant_id,
      body.firstName,
      body.lastName,
    );
  }

  /**
   * Reactivate an expired/cancelled/paused subscription.
   * Free → instant. Paid → returns a fresh gateway checkout URL.
   */
  @Post("reactivate")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactivate(@Req() req: any) {
    return this.billingService.reactivateSubscription(req.user.tenant_id);
  }

  /**
   * Rewarded-ad callback: grants +1 task credit for today (free plan only).
   * Frontend calls this after a rewarded ad completes.
   */
  @Post("ad-unlock")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async adUnlock(@Req() req: any) {
    return this.billingService.grantAdUnlock(req.user.tenant_id);
  }
}
