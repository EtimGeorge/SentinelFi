import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, UnauthorizedException, Res } from '@nestjs/common';
import { Response } from 'express';
import { FinanceCoreService } from './finance-core.service';
import { GetFinancialDocumentsDto } from './dto/get-financial-documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../../shared/types/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('finance-core')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceCoreController {
  constructor(private readonly financeService: FinanceCoreService) {}

  @Get('fiscal-years')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getFiscalYears() {
    return this.financeService.getFiscalYears();
  }

  @Post('fiscal-years')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async createFiscalYear(@Body() body: { label: string; startDate: string; endDate: string }) {
    return this.financeService.createFiscalYear({
      label: body.label,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate)
    });
  }

  @Get('departments')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getDepartments() {
    return this.financeService.getDepartments();
  }

  @Post('departments')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async createDepartment(@Body() body: { name: string; code: string; parentId?: string }) {
    return this.financeService.createDepartment(body);
  }

  @Post('cost-centers')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async createCostCenter(@Body() body: { name: string; code: string; departmentId: string }) {
    return this.financeService.createCostCenter(body);
  }

  @Get('chart-of-accounts')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getChartOfAccounts() {
    return this.financeService.getChartOfAccounts();
  }

  // --- P2P Requisitions ---

  @Get('requisitions')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getRequisitions(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getRequisitions(query);
  }

  @Post('requisitions')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async createRequisition(@Body() body: { 
    description: string; 
    estimatedAmount: number; 
    costCenterId: string; 
    glAccountId: string;
    vendorName?: string;
    requiredByDate?: string;
    currency?: string;
    exchangeRate?: number;
  }) {
    return this.financeService.createRequisition(body);
  }

  // --- Purchase Orders ---

  @Get('purchase-orders')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getPurchaseOrders(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getPurchaseOrders(query);
  }

  @Post('purchase-orders')
  @Roles(Role.FinanceManager, Role.AdminManager, Role.CFO, Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async createPurchaseOrder(
    @Body() body: { requisitionId: string },
    @Req() req: AuthenticatedRequest
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.financeService.createPurchaseOrder(body.requisitionId, req.user);
  }

  @Post('requisitions/:id/reject')
  @Roles(Role.FinanceManager, Role.AdminManager, Role.CFO, Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async rejectRequisition(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.financeService.rejectRequisition(id, req.user);
  }

  @Get('purchase-orders/:id/pdf')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getPurchaseOrderPdf(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    const buffer = await this.financeService.generatePurchaseOrderPdf(id, req.user.tenantId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=PO-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // --- Invoices ---

  @Get('invoices')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getInvoices(@Query() query: GetFinancialDocumentsDto) {
    return this.financeService.getInvoices(query);
  }

  @Post('invoices')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async createInvoice(@Body() body: {
    invoiceNumber: string;
    amount: number;
    vendorName: string;
    invoiceDate: string;
    poId?: string;
    costCenterId: string;
    glAccountId: string;
    currency?: string;
    exchangeRate?: number;
  }) {
    return this.financeService.createInvoice(body);
  }

  @Get('invoices/:id/pdf')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getInvoicePdf(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    const buffer = await this.financeService.generateInvoicePdf(id, req.user.tenantId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Invoice-${id}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // --- Budget Consumption Analytics ---

  @Get('budget-consumption')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getBudgetConsumption(
    @Query('costCenterId') costCenterId: string,
    @Query('glAccountId') glAccountId: string,
    @Query('fiscalPeriodId') fiscalPeriodId: string
  ) {
    return this.financeService.getBudgetConsumption(costCenterId, glAccountId, fiscalPeriodId);
  }

  @Get('operational-analytics')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getOperationalAnalytics(
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    return this.financeService.getOperationalAnalytics(fiscalYearId, costCenterId);
  }

  @Get('employees')
  @Roles(Role.CFO, Role.FinanceManager, Role.FinanceOfficer, Role.AdminDirector, Role.AdminManager, Role.CEO, Role.SuperAdmin)
  async getEmployees() {
    return this.financeService.getEmployees();
  }

  @Get('opex-intelligence')
  @Roles(Role.CFO, Role.FinanceManager, Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async getOpexIntelligence(@Query('fiscalYearId') fiscalYearId?: string) {
    return this.financeService.getOpexIntelligence(fiscalYearId);
  }
}
