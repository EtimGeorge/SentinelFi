import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProvisionOfflineTenantDto } from './dto/provision-tenant.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@shared/types/role.enum';
import { BillingService } from './billing.service';
import { BillingCycle } from './entities/subscription.entity';
import { BillingOverviewDto } from './dto/billing-overview.dto';
import { InvoiceDto } from './dto/invoice.dto';
import { Response } from 'express';

/**
 * SuperAdmin-only billing management routes.
 * All under /super/billing — protected by SuperAdmin role.
 */
@Controller('super/billing')
@UseGuards(RolesGuard)
@Roles(Role.SuperAdmin)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Platform Overview ────────────────────────────────────────────────────

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getBillingOverview(): Promise<BillingOverviewDto> {
    return this.billingService.getBillingOverview();
  }

  /**
   * List all tenants with subscription status, expiry, and revenue breakdown.
   * Powers the SuperAdmin billing management dashboard.
   */
  @Get('tenants')
  @HttpCode(HttpStatus.OK)
  async getAllTenantSubscriptions() {
    return this.billingService.getAllTenantSubscriptions();
  }

  // ─── SuperAdmin Provisioning ─────────────────────────────────────────────

  /**
   * Provision a new tenant OR renew/extend an existing one directly.
   * SuperAdmin can set custom pricing, plan, and access duration.
   * If the tenant already exists (by email or name), their subscription is extended.
   */
  @Post('provision-tenant')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('receipt_file', { dest: './uploads/billing-receipts' }))
  @UsePipes(new ValidationPipe({ transform: true }))
  async provisionTenant(
    @Body() body: ProvisionOfflineTenantDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.billingService.provisionTenantBySuperAdmin(body, file);
  }

  // ─── Invoice Management ───────────────────────────────────────────────────

  @Get('invoices')
  @HttpCode(HttpStatus.OK)
  async getRecentInvoices(): Promise<InvoiceDto[]> {
    return this.billingService.getRecentInvoices();
  }

  @Get('invoices/:id/download')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.billingService.downloadInvoice(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sentinelfi-invoice-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  // ─── Offline Audit Proofs ────────────────────────────────────────────────

  @Get('subscriptions/:id/proof')
  async downloadPaymentProof(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.billingService.getPaymentProofPath(id);
    res.sendFile(filePath);
  }
}

