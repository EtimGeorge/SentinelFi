import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { GeneralLedgerService } from "./general-ledger.service";
import {
  CreateJournalEntryDto,
  VoidJournalEntryDto,
  QueryJournalEntriesDto,
} from "./dto/journal-entry.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedRequest } from "../common/interfaces/authenticated-request.interface";
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

@Controller("finance-core/general-ledger")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeneralLedgerController {
  constructor(private readonly glService: GeneralLedgerService) {}

  // ─── Reports (declare before ":id" routes) ───────────────────────────────

  @Get("reports/trial-balance")
  @Roles(...READ_ROLES)
  async getTrialBalance(
    @Query() query: { from?: string; to?: string },
  ) {
    return this.glService.getTrialBalance({
      from: query.from,
      to: query.to,
    });
  }

  @Get("accounts/:accountId/ledger")
  @Roles(...READ_ROLES)
  async getAccountLedger(
    @Param("accountId") accountId: string,
    @Query() query: { from?: string; to?: string },
  ) {
    return this.glService.getAccountLedger(accountId, {
      from: query.from,
      to: query.to,
    });
  }

  // ─── Journal entries ─────────────────────────────────────────────────────

  @Get()
  @Roles(...READ_ROLES)
  async listEntries(@Query() query: QueryJournalEntriesDto) {
    return this.glService.listEntries(query);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async createEntry(
    @Body() dto: CreateJournalEntryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.glService.postJournalEntry({
      entryDate: dto.entryDate,
      memo: dto.memo,
      currency: dto.currency,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId,
      sourceReference: dto.sourceReference,
      status: dto.status,
      actorUserId: req.user.id,
      lines: dto.lines,
    });
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  async getEntry(@Param("id") id: string) {
    return this.glService.getEntry(id);
  }

  @Post(":id/post")
  @Roles(...WRITE_ROLES)
  async postDraft(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.glService.postDraft(id, req.user.id);
  }

  @Post(":id/void")
  @Roles(...WRITE_ROLES)
  async voidEntry(
    @Param("id") id: string,
    @Body() dto: VoidJournalEntryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new UnauthorizedException("User not authenticated.");
    return this.glService.voidJournalEntry(
      id,
      req.user.id,
      dto.reason,
    );
  }
}
