import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  Req,
  SetMetadata,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from '../auth/guards/feature-flag.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'shared/types/role.enum';
import { WbsService } from './wbs.service';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { IsString, IsEmail, IsArray, IsIn } from 'class-validator';
import { UsePipes, ValidationPipe } from '@nestjs/common';

class AutomatedReportRequestDto {
  @IsIn(['Variance', 'WBS', 'Executive'])
  reportType!: 'Variance' | 'WBS' | 'Executive';

  @IsString()
  wbsCategory!: string;

  @IsArray()
  @IsEmail({}, { each: true })
  emailRecipients!: string[];

  @IsIn(['Daily EOD', 'Weekly', 'Manual'])
  schedule!: 'Daily EOD' | 'Weekly' | 'Manual';
}

/**
 * DCS (Document Control System) Controller
 *
 * All routes in this controller are gated behind the `isDcsEnabled` feature flag.
 * If DCS is disabled in the tenant's settings, every request returns 403 before
 * any business logic runs.
 */
@Controller('dcs')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@SetMetadata(FEATURE_FLAG_KEY, 'isDcsEnabled')
export class DcsController {
  private readonly logger = new Logger(DcsController.name);

  constructor(private readonly wbsService: WbsService) {}

  /**
   * GET /api/v1/dcs/status
   * Returns the DCS connectivity status for this tenant.
   */
  @Get('status')
  @Roles(
    Role.AdminDirector,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.CEO,
  )
  async getDcsStatus(@Req() req: AuthenticatedRequest) {
    this.logger.log(`[DCS] Status check by user ${req.user?.id} for tenant ${req.user?.tenant_id}`);
    return {
      status: 'active',
      description: 'Document Control System is enabled for this organisation.',
      capabilities: ['schedule-report', 'archive', 'version-control'],
    };
  }

  /**
   * POST /api/v1/dcs/schedule-report
   * Queues an automated scheduled report for DCS distribution.
   * A real implementation would push to a BullMQ/Kafka job queue.
   */
  @Post('schedule-report')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async scheduleReport(
    @Body() dto: AutomatedReportRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!dto.emailRecipients || dto.emailRecipients.length === 0) {
      throw new BadRequestException('Report scheduling requires at least one email recipient.');
    }

    this.logger.log(
      `[DCS] Report job queued: type=${dto.reportType}, schedule=${dto.schedule}, ` +
      `recipients=${dto.emailRecipients.length}, tenant=${req.user?.tenant_id}`,
    );

    // TODO Phase 7: Dispatch to BullMQ job queue:
    // await this.dcsQueue.add('generate-report', { tenantId: req.user.tenant_id, ...dto });

    return {
      message: 'Report generation job successfully queued to DCS.',
      schedule: dto.schedule,
      reportType: dto.reportType,
      recipients: dto.emailRecipients.length,
      estimatedCompletion: dto.schedule === 'Manual' ? 'Within 2 minutes' : `Next ${dto.schedule} window`,
    };
  }
}
