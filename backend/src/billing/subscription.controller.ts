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

@Controller("billing")
export class SubscriptionController {
  constructor(private readonly billingService: BillingService) {}

  // ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

  /**
   * Start a free 14-day trial. No payment required.
   * Creates tenant immediately and dispatches magic-link.
   */
  @Public()
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
   * Initiate a paid subscription.
   * Returns a payment gateway URL. Tenant created ONLY after webhook confirms payment.
   */
  @Public()
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
}
