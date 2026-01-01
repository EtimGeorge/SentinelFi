import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  UnauthorizedException, // NEW: Import UnauthorizedException
  Req, // Added
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { WbsService } from "./wbs.service"; // Used to fetch data for the report
import { AuthenticatedRequest } from "../common/interfaces/request.interface"; // Corrected import path

// DTO for the automated report request
class AutomatedReportRequestDto {
  reportType!: "Variance" | "WBS" | "Executive";
  wbsCategory!: string; // Filter by a Level 1 WBS Category
  emailRecipients!: string[];
  schedule!: "Daily EOD" | "Weekly" | "Manual";
}

@Controller("dcs") // Base path: /api/v1/dcs
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class DcsController {
  constructor(private readonly wbsService: WbsService) {}

  /**
   * Endpoint: POST /api/v1/dcs/schedule-report
   * Phase 6 Deliverable: Automated, Scheduled Report Distribution (Simulated DCS Interface)
   * Permissions: Finance, Operational Head (Roles concerned with reports)
   */
  @Post("schedule-report")
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted, as the job is now queued
  @Roles(Role.Admin, Role.Finance, Role.OperationalHead)
  async scheduleReport(@Body() requestDto: AutomatedReportRequestDto) {
    // 1. Validate recipients
    if (
      !requestDto.emailRecipients ||
      requestDto.emailRecipients.length === 0
    ) {
      throw new BadRequestException(
        "Report scheduling requires at least one email recipient.",
      );
    }

    // 2. Simulate Report Generation and DCS Queueing
    console.log(
      `[DCS] Report generation request received for: ${requestDto.reportType}`,
    );
    console.log(
      `[DCS] Filters: WBS Category=${requestDto.wbsCategory}, Schedule=${requestDto.schedule}`,
    );
    console.log(`[DCS] Recipients: ${requestDto.emailRecipients.join(", ")}`);

    // In a real system, this would queue a job (e.g., to a Kafka topic or BullMQ queue)
    // The job would run the logic below:

    // const reportData = await this.wbsService.findAllWbsBudgetsWithRollup(requestDto.wbsCategory);
    // const securePDF = generatePDF(reportData);
    // sendEmail(securePDF, requestDto.emailRecipients);

    return {
      message: "Report generation job successfully queued to DCS.",
      schedule: requestDto.schedule,
      recipients: requestDto.emailRecipients.length,
    };
  }

  /**
   * Endpoint: GET /api/v1/dcs/test-data
   * Utility for frontend to see the kind of data the report consumes.
   */
  @Get("test-data")
  @Roles(Role.Admin, Role.Finance)
  async getReportDataTest(@Req() req: AuthenticatedRequest) { // Add AuthenticatedRequest
    if (!req.user) { // NEW: User check
      throw new UnauthorizedException('User not authenticated.');
    }
    const tenant_id = req.user.tenant_id;
    if (!tenant_id) {
      throw new BadRequestException("Tenant ID not found in authenticated user payload.");
    }
    // Just returning a sample of the full WBS data
    return this.wbsService.findAllWbsBudgetsWithRollup(tenant_id); // Pass tenant_id
  }
}