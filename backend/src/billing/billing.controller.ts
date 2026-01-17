import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Param,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { BillingService } from "./billing.service";
import { BillingOverviewDto } from "./dto/billing-overview.dto";
import { InvoiceDto } from "./dto/invoice.dto";
import { Response } from "express";

@Controller("super/billing")
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Roles(Role.SuperAdmin)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("overview")
  @HttpCode(HttpStatus.OK)
  async getBillingOverview(): Promise<BillingOverviewDto> {
    return this.billingService.getBillingOverview();
  }

  @Get("invoices")
  @HttpCode(HttpStatus.OK)
  async getRecentInvoices(): Promise<InvoiceDto[]> {
    return this.billingService.getRecentInvoices();
  }

  @Get("invoices/:id/download")
  async downloadInvoice(@Param("id") id: string, @Res() res: Response) {
    const pdfBuffer = await this.billingService.downloadInvoice(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice-${id}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
