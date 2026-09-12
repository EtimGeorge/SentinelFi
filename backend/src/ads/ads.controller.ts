import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../common/decorators/public.decorator";
import { AdsService } from "./ads.service";
import { AdPlacement } from "./ads.constants";

@Controller("ads")
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * Public ad-loader config: provider, AdSense IDs, reward duration.
   * No secrets exposed.
   */
  @Public()
  @Get("config")
  @HttpCode(HttpStatus.OK)
  getConfig() {
    return this.adsService.getPublicConfig();
  }

  /**
   * Start a rewarded-ad session. Returns sessionId + requiredSeconds.
   * Frontend shows the provider creative, then runs its own countdown
   * mirroring requiredSeconds before calling complete.
   */
  @Post("rewarded/start")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  startRewarded(@Req() req: any) {
    return this.adsService.startRewardedSession(
      req.user.tenant_id,
      AdPlacement.REWARDED_TASK_UNLOCK,
    );
  }

  /**
   * Complete a rewarded-ad session. Server verifies elapsed time
   * (and provider SSV receipt when configured) then grants +1 task.
   */
  @Post("rewarded/complete")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  completeRewarded(
    @Req() req: any,
    @Body() body: { sessionId: string; providerReceipt?: string },
  ) {
    return this.adsService.completeRewardedSession(
      req.user.tenant_id,
      body.sessionId,
      body.providerReceipt,
    );
  }
}
