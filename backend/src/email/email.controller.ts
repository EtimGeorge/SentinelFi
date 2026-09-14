import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { EmailService } from "./email.service";

/**
 * SuperAdmin-only email delivery analytics — real data from email_log.
 */
@Controller("email-stats")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  @Roles("SuperAdmin")
  async getEmailStats(@Query("days") days?: string) {
    const parsed = days ? parseInt(days, 10) : 30;
    const safeRange = Number.isNaN(parsed) ? 30 : parsed;
    return this.emailService.getEmailStats(safeRange);
  }
}