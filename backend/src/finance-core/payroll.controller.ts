import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { PayrollService } from "./payroll.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "@shared/types/role.enum";
import { PayrollLineItemType } from "./entities/payroll-line-item.entity";

@Controller("finance/payroll")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post("runs")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  createRun(
    @Body()
    data: {
      runIdentifier: string;
      fiscalPeriodId: string;
      runDate: string;
    },
  ) {
    return this.payrollService.createRun(data);
  }

  @Get("kpis")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  getKPIs() {
    return this.payrollService.getKPIs();
  }

  @Get("runs")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  getRuns() {
    return this.payrollService.getRuns();
  }

  @Get("runs/:id")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  getRunDetails(@Param("id") id: string) {
    return this.payrollService.getRunDetails(id);
  }

  @Post("runs/:id/items")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  addLineItem(
    @Param("id") id: string,
    @Body()
    data: {
      employeeId: string;
      costCenterId: string;
      glAccountId: string;
      itemType: PayrollLineItemType;
      amount: number;
    },
  ) {
    return this.payrollService.addLineItem(id, data);
  }

  @Patch("runs/:id/approve")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  approveRun(@Param("id") id: string) {
    return this.payrollService.approveRun(id);
  }

  @Patch("runs/:id/post")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  postRun(@Param("id") id: string) {
    return this.payrollService.postRun(id);
  }

  @Delete("runs/:id")
  @Roles(
    Role.CFO,
    Role.FinanceManager,
    Role.AdminDirector,
    Role.AdminManager,
    Role.SuperAdmin,
    Role.CEO,
    Role.TechnicalDirector,
  )
  deleteRun(@Param("id") id: string) {
    return this.payrollService.deleteRun(id);
  }
}
