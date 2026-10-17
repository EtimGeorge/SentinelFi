import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { FinanceCoreService } from "./finance-core.service";
import { GetFinancialDocumentsDto } from "./dto/get-financial-documents.dto";
import { CreateVendorDto, UpdateVendorDto } from "./dto/vendor.dto";
import { QueryVendorsDto } from "./dto/query-vendors.dto";
import { VendorStatus } from "./entities/vendor.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "../../../shared/types/role.enum";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";

@Controller("finance-core")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceCoreController {
  constructor(private readonly financeService: FinanceCoreService) {}

  @Get("fiscal-years")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getFiscalYears() {
    return this.financeService.getFiscalYears();
  }

  @Post("fiscal-years")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createFiscalYear(
    @Body() body: { label: string; startDate: string; endDate: string },
  ) {
    return this.financeService.createFiscalYear({
      label: body.label,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Get("departments")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getDepartments() {
    return this.financeService.getDepartments();
  }

  @Post("departments")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createDepartment(
    @Body() body: { name: string; code: string; parentId?: string },
  ) {
    return this.financeService.createDepartment(body);
  }

  @Post("cost-centers")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createCostCenter(
    @Body() body: { name: string; code: string; departmentId: string },
  ) {
    return this.financeService.createCostCenter(body);
  }

  // GET /finance-core/chart-of-accounts is served by ChartOfAccountsController
  // (identical tree shape) — removed here so the path isn't mapped twice.

  // --- Vendor Master ---

  @Get("vendors")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getVendors(@Query() query: QueryVendorsDto) {
    return this.financeService.getVendors(query);
  }

  @Get("vendors/:id")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getVendor(@Param("id") id: string) {
    return this.financeService.getVendor(id);
  }

  @Post("vendors")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createVendor(@Body() body: CreateVendorDto) {
    return this.financeService.createVendor(body);
  }

  @Patch("vendors/:id")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async updateVendor(@Param("id") id: string, @Body() body: UpdateVendorDto) {
    return this.financeService.updateVendor(id, body);
  }

  @Post("vendors/:id/deactivate")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async deactivateVendor(@Param("id") id: string) {
    return this.financeService.setVendorStatus(id, VendorStatus.INACTIVE);
  }

  @Post("vendors/:id/activate")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async activateVendor(@Param("id") id: string) {
    return this.financeService.setVendorStatus(id, VendorStatus.ACTIVE);
  }

  // --- P2P Requisitions ---

  @Get("requisitions")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.SuperAdmin,
  )
  async getRequisitions(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getRequisitions(query);
  }

  @Post("requisitions")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createRequisition(
    @Body()
    body: {
      description: string;
      estimatedAmount: number;
      costCenterId: string;
      glAccountId: string;
      vendorId?: string;
      vendorName?: string;
      requiredByDate?: string;
      currency?: string;
      exchangeRate?: number;
    },
  ) {
    return this.financeService.createRequisition(body);
  }

  // --- Purchase Orders ---

  @Get("purchase-orders")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getPurchaseOrders(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getPurchaseOrders(query);
  }

  @Post("purchase-orders")
  @Roles(
    Role.FinanceManager,
    Role.AdminManager,
    Role.CFO,
    Role.AdminDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createPurchaseOrder(
    @Body()
    body: {
      requisitionId: string;
      lines?: Array<{
        description: string;
        quantity: number;
        unitAmount: number;
        glAccountId?: string | null;
        costCenterId?: string | null;
      }>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.financeService.createPurchaseOrder(
      body.requisitionId,
      req.user,
      body.lines,
    );
  }

  @Post("requisitions/:id/reject")
  @Roles(
    Role.FinanceManager,
    Role.AdminManager,
    Role.CFO,
    Role.AdminDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async rejectRequisition(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.financeService.rejectRequisition(id, req.user);
  }

  @Get("purchase-orders/:id/pdf")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getPurchaseOrderPdf(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    const buffer = await this.financeService.generatePurchaseOrderPdf(
      id,
      req.user.tenant_id,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=PO-${id}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  // --- Invoices ---

  @Get("invoices")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getInvoices(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getInvoices(query);
  }
  @Post("invoices")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async createInvoice(
    @Body()
    body: {
      invoiceNumber: string;
      amount: number;
      vendorName: string;
      invoiceDate: string;
      poId?: string;
      costCenterId: string;
      glAccountId: string;
      currency?: string;
      exchangeRate?: number;
      vendorId?: string;
      retentionPct?: number;
      whtPct?: number;
    },
  ) {
    return this.financeService.createInvoice(body);
  }

  @Get("invoices/:id/pdf")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getInvoicePdf(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    const buffer = await this.financeService.generateInvoicePdf(
      id,
      req.user.tenant_id,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Invoice-${id}.pdf`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post("invoices/:id/pay")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
  )
  async payInvoice(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    if (!req.user || !req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    return this.financeService.payInvoice(
      id,
      req.user.tenant_id,
      req.user.id,
      req.user.roles?.[0]?.name,
    );
  }

  // --- Receipts & 3-Way Match (Phase 4.8) ---

  @Post("receipts")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async recordReceipt(
    @Body()
    body: {
      purchaseOrderId: string;
      receivedDate: string;
      quantity?: number;
      unitAmount?: number;
      notes?: string;
      currency?: string;
      exchangeRate?: number;
      lines?: Array<{
        purchaseOrderLineId: string;
        quantity: number;
        unitAmount?: number;
      }>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.financeService.recordReceipt({
      purchaseOrderId: body.purchaseOrderId,
      receivedByUserId: req.user.id,
      receivedDate: body.receivedDate,
      quantity: body.quantity,
      unitAmount: body.unitAmount,
      notes: body.notes,
      currency: body.currency,
      exchangeRate: body.exchangeRate,
      lines: body.lines,
    });
  }

  @Get("purchase-orders/:id/receipts")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getPurchaseOrderReceipts(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    return this.financeService.getPurchaseOrderReceipts(id, req.user.tenant_id);
  }

  @Get("purchase-orders/:id/three-way-match")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getThreeWayMatch(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    return this.financeService.getThreeWayMatch(id, req.user.tenant_id);
  }

  @Get("procurement-needs-attention")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getProcurementNeedsAttention(@Req() req: AuthenticatedRequest) {
    if (!req.user.tenant_id)
      throw new UnauthorizedException("Tenant context missing.");
    return this.financeService.getProcurementNeedsAttention(req.user.tenant_id);
  }

  // --- Budget Consumption Analytics ---

  @Get("budget-consumption")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getBudgetConsumption(
    @Query("costCenterId") costCenterId: string,
    @Query("glAccountId") glAccountId: string,
    @Query("fiscalPeriodId") fiscalPeriodId: string,
  ) {
    return this.financeService.getBudgetConsumption(
      costCenterId,
      glAccountId,
      fiscalPeriodId,
    );
  }

  @Get("operational-analytics")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getOperationalAnalytics(
    @Query("fiscalYearId") fiscalYearId: string,
    @Query("costCenterId") costCenterId?: string,
  ) {
    return this.financeService.getOperationalAnalytics(
      fiscalYearId,
      costCenterId,
    );
  }

  @Get("employees")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.FinanceOfficer,
    Role.AdminDirector,
    Role.AdminManager,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getEmployees() {
    return this.financeService.getEmployees();
  }

  @Get("opex-intelligence")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.OperationalDirector,
    Role.TechnicalDirector,
    Role.CEO,
    Role.SuperAdmin,
  )
  async getOpexIntelligence(@Query("fiscalYearId") fiscalYearId?: string) {
    return this.financeService.getOpexIntelligence(fiscalYearId);
  }
}
