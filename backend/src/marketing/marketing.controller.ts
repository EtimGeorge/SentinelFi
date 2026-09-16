import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  Req,
} from "@nestjs/common";
import { MarketingService } from "./marketing.service";
import { Public } from "../common/decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";

@Controller("marketing")
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("contact")
  @HttpCode(HttpStatus.OK)
  async handleContactRequest(
    @Body()
    data: {
      name: string;
      email: string;
      company: string;
      message: string;
      interests: string[];
    },
  ) {
    return this.marketingService.processContactRequest(data);
  }

  /** Learner progress: prefers the authenticated identity, else the visitor cookie. */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("academy/progress")
  async getAcademyProgress(
    @Req() req: Request,
    @Query("visitorId") visitorId?: string,
  ) {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    return this.marketingService.getAcademyProgress(userId, visitorId);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("academy/progress")
  @HttpCode(HttpStatus.OK)
  async saveAcademyProgress(
    @Req() req: Request,
    @Body() body: { visitorId?: string; ledger?: Record<string, unknown> },
  ) {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    return this.marketingService.saveAcademyProgress(
      { ledger: body?.ledger },
      userId,
      body?.visitorId,
    );
  }
}
