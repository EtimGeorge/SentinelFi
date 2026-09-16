import { Injectable, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, FindOptionsWhere } from "typeorm";
import { WbsBudgetEntity } from "../wbs/wbs-budget.entity";
import { UserEntity } from "../auth/user.entity";
import { LiveExpenseEntity } from "../wbs/live-expense.entity";

/**
 * LIKE metacharacters (%, _, [ ] and the backslash escape itself) are escaped
 * so a search string can never act as a wildcard pattern. The ESCAPE clause
 * is implied by backslash-escaping; Postgres treats backslash as the default
 * LIKE escape character.
 */
function sanitizeLikePattern(input: string): string {
  return input.replace(/[\\%_\[\]]/g, (ch) => `\\${ch}`);
}

function isUuidLike(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    )
  );
}

@Injectable()
export class SearchService {
  /** Per-entity cap: search is an autocomplete aid, never a bulk export. */
  private static readonly SEARCH_RESULT_LIMIT = 50;

  constructor(
    @InjectRepository(WbsBudgetEntity)
    private wbsRepository: Repository<WbsBudgetEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(LiveExpenseEntity)
    private expenseRepository: Repository<LiveExpenseEntity>,
  ) {}

  async search(query: string, tenantId: string | null | undefined) {
    // Hardened edges (review): tenant scoping is fail-closed. An empty-string
    // tenant would previously fall into the global-search branch (falsy check)
    // — now only null/undefined (platform SuperAdmin) search globally.
    const isPlatformSearch = tenantId === null || tenantId === undefined;
    if (!isPlatformSearch && !isUuidLike(tenantId)) {
      throw new ForbiddenException(
        "Invalid tenant scope for search. Please sign in again.",
      );
    }
    const rawQuery = String(query ?? "");
    const safeQuery = sanitizeLikePattern(rawQuery.trim().slice(0, 200));
    if (!safeQuery) {
      return { wbsItems: [], users: [], expenses: [] };
    }
    // Always scope multi-tenant data to the current tenant. tenant_id is present
    // for tenant users; null for platform SuperAdmins (who may search globally).
    const wbsScopes: FindOptionsWhere<WbsBudgetEntity>[] = !isPlatformSearch
      ? [
          { tenant_id: tenantId, wbs_code: Like(`%${safeQuery}%`) },
          { tenant_id: tenantId, description: Like(`%${safeQuery}%`) },
        ]
      : [
          { wbs_code: Like(`%${safeQuery}%`) },
          { description: Like(`%${safeQuery}%`) },
        ];

    // UserEntity lives in the SHARED public schema — without a tenant filter an
    // email search leaks user records belonging to every other tenant.
    const userWhere: FindOptionsWhere<UserEntity> = !isPlatformSearch
      ? { tenant_id: tenantId, email: Like(`%${safeQuery}%`) }
      : { email: Like(`%${safeQuery}%`) };

    const expenseWhere: FindOptionsWhere<LiveExpenseEntity>[] = !isPlatformSearch
      ? [{ tenant_id: tenantId, description: Like(`%${safeQuery}%`) }]
      : [{ description: Like(`%${safeQuery}%`) }];

    const wbsItems = await this.wbsRepository.find({
      where: wbsScopes,
      take: SearchService.SEARCH_RESULT_LIMIT,
    });

    const users = await this.userRepository.find({
      where: userWhere,
      take: SearchService.SEARCH_RESULT_LIMIT,
    });

    const expenses = await this.expenseRepository.find({
      where: expenseWhere,
      take: SearchService.SEARCH_RESULT_LIMIT,
    });

    return {
      wbsItems,
      users,
      expenses,
    };
  }
}