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
import { ChartOfAccountsService } from "./chart-of-accounts.service";
import {
  CreateAccountClassDto,
  UpdateAccountClassDto,
  CreateAccountGroupDto,
  UpdateAccountGroupDto,
  CreateGlAccountDto,
  UpdateGlAccountDto,
} from "./dto/chart-of-accounts.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "../../../shared/types/role.enum";

const READ_ROLES = [
  Role.CFO,
  Role.FinanceManager,
  Role.FinanceOfficer,
  Role.AdminDirector,
  Role.AdminManager,
  Role.CEO,
  Role.OperationalDirector,
  Role.TechnicalDirector,
  Role.SuperAdmin,
];

const WRITE_ROLES = [
  Role.CFO,
  Role.FinanceManager,
  Role.AdminDirector,
  Role.AdminManager,
  Role.SuperAdmin,
];

@Controller("finance-core/chart-of-accounts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChartOfAccountsController {
  constructor(private readonly chartOfAccountsService: ChartOfAccountsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async getTree() {
    return this.chartOfAccountsService.getTree();
  }

  @Get("accounts")
  @Roles(...READ_ROLES)
  async listAccounts() {
    return this.chartOfAccountsService.listAccounts();
  }

  @Post("seed-defaults")
  @Roles(...WRITE_ROLES)
  async seedDefaults() {
    return this.chartOfAccountsService.seedDefaults();
  }

  // ─── Classes ─────────────────────────────────────────────────────────────

  @Post("classes")
  @Roles(...WRITE_ROLES)
  async createClass(@Body() dto: CreateAccountClassDto) {
    return this.chartOfAccountsService.createClass(dto);
  }

  @Patch("classes/:id")
  @Roles(...WRITE_ROLES)
  async updateClass(
    @Param("id") id: string,
    @Body() dto: UpdateAccountClassDto,
  ) {
    return this.chartOfAccountsService.updateClass(id, dto);
  }

  @Delete("classes/:id")
  @Roles(...WRITE_ROLES)
  async deleteClass(@Param("id") id: string) {
    return this.chartOfAccountsService.deleteClass(id);
  }

  // ─── Groups ──────────────────────────────────────────────────────────────

  @Post("groups")
  @Roles(...WRITE_ROLES)
  async createGroup(@Body() dto: CreateAccountGroupDto) {
    return this.chartOfAccountsService.createGroup(dto);
  }

  @Patch("groups/:id")
  @Roles(...WRITE_ROLES)
  async updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateAccountGroupDto,
  ) {
    return this.chartOfAccountsService.updateGroup(id, dto);
  }

  @Delete("groups/:id")
  @Roles(...WRITE_ROLES)
  async deleteGroup(@Param("id") id: string) {
    return this.chartOfAccountsService.deleteGroup(id);
  }

  // ─── Accounts ────────────────────────────────────────────────────────────

  @Post("accounts")
  @Roles(...WRITE_ROLES)
  async createAccount(@Body() dto: CreateGlAccountDto) {
    return this.chartOfAccountsService.createAccount(dto);
  }

  @Patch("accounts/:id")
  @Roles(...WRITE_ROLES)
  async updateAccount(
    @Param("id") id: string,
    @Body() dto: UpdateGlAccountDto,
  ) {
    return this.chartOfAccountsService.updateAccount(id, dto);
  }

  @Delete("accounts/:id")
  @Roles(...WRITE_ROLES)
  async deleteAccount(@Param("id") id: string) {
    return this.chartOfAccountsService.deleteAccount(id);
  }
}
