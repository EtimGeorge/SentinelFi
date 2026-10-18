import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { ClsService } from "nestjs-cls";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { AccountClassEntity } from "./entities/account-class.entity";
import { AccountGroupEntity } from "./entities/account-group.entity";
import { GLAccountEntity } from "./entities/gl-account.entity";
import { DEFAULT_CHART_OF_ACCOUNTS } from "./default-chart-of-accounts";
import {
  CreateAccountClassDto,
  UpdateAccountClassDto,
  CreateAccountGroupDto,
  UpdateAccountGroupDto,
  CreateGlAccountDto,
  UpdateGlAccountDto,
} from "./dto/chart-of-accounts.dto";

/**
 * Chart-of-accounts management: CRUD over the three-level hierarchy
 * (class -> group -> account) plus the idempotent default-chart seeding that
 * gives tenants a usable set of accounts for GL posting.
 */
@Injectable()
export class ChartOfAccountsService {
  private readonly logger = new Logger(ChartOfAccountsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cls: ClsService,
    @InjectRepository(AccountClassEntity, TENANT_DATA_SOURCE)
    private accountClassRepo: Repository<AccountClassEntity>,
    @InjectRepository(AccountGroupEntity, TENANT_DATA_SOURCE)
    private accountGroupRepo: Repository<AccountGroupEntity>,
    @InjectRepository(GLAccountEntity, TENANT_DATA_SOURCE)
    private glAccountRepo: Repository<GLAccountEntity>,
  ) {}

  private getTenantId(): string {
    return this.cls.get("tenant_id");
  }

  // ─── Read ────────────────────────────────────────────────────────────────

  async getTree() {
    const tenantId = this.getTenantId();
    return this.accountClassRepo.find({
      where: { tenant_id: tenantId },
      relations: ["accountGroups", "accountGroups.glAccounts"],
      order: { code: "ASC" },
    });
  }

  async listAccounts() {
    const tenantId = this.getTenantId();
    return this.glAccountRepo.find({
      where: { tenant_id: tenantId },
      order: { code: "ASC" },
    });
  }

  /**
   * Resolve a single GL account by its tenant-unique code. Accepts an optional
   * manager so callers can resolve accounts inside their own transaction.
   */
  async getAccountByCode(
    code: string,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<GLAccountEntity | null> {
    if (manager) {
      return manager.findOne(GLAccountEntity, {
        where: { tenant_id: tenantId, code },
      });
    }
    return this.glAccountRepo.findOne({
      where: { tenant_id: tenantId, code },
    });
  }

  /**
   * Resolve several system accounts by code for an automated posting,
   * seeding the default chart first so a tenant that has never pressed
   * "Seed Default Chart" still resolves. Throws when an account is missing or
   * inactive — automated postings wrap this in a best-effort guard, so a
   * chart problem is logged rather than surfacing into a business API.
   */
  async requireAccountsByCode(
    tenantId: string,
    codes: string[],
    manager?: EntityManager,
  ): Promise<Map<string, GLAccountEntity>> {
    await this.ensureDefaultChartOfAccounts(tenantId, manager);
    const resolved = new Map<string, GLAccountEntity>();
    for (const code of codes) {
      const account = await this.getAccountByCode(code, tenantId, manager);
      if (!account) {
        throw new Error(
          `GL account ${code} is missing from the chart of accounts.`,
        );
      }
      if (!account.is_active) {
        throw new Error(`GL account ${code} is inactive.`);
      }
      resolved.set(code, account);
    }
    return resolved;
  }

  // ─── Account classes ─────────────────────────────────────────────────────

  async createClass(dto: CreateAccountClassDto) {
    const tenantId = this.getTenantId();
    const existing = await this.accountClassRepo.findOne({
      where: { tenant_id: tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Account class code "${dto.code}" already exists.`,
      );
    }
    const entity = this.accountClassRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      code: dto.code,
      base_type: dto.baseType,
    });
    return this.accountClassRepo.save(entity);
  }

  async updateClass(id: string, dto: UpdateAccountClassDto) {
    const tenantId = this.getTenantId();
    const entity = await this.accountClassRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("Account class not found.");

    if (dto.code && dto.code !== entity.code) {
      const clash = await this.accountClassRepo.findOne({
        where: { tenant_id: tenantId, code: dto.code },
      });
      if (clash) {
        throw new ConflictException(
          `Account class code "${dto.code}" already exists.`,
        );
      }
      entity.code = dto.code;
    }
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.baseType !== undefined) entity.base_type = dto.baseType;
    return this.accountClassRepo.save(entity);
  }

  async deleteClass(id: string) {
    const tenantId = this.getTenantId();
    const entity = await this.accountClassRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("Account class not found.");

    const groups = await this.accountGroupRepo.count({
      where: { tenant_id: tenantId, account_class_id: id },
    });
    if (groups > 0) {
      throw new ConflictException(
        "Cannot delete an account class that still has account groups.",
      );
    }
    await this.accountClassRepo.remove(entity);
    return { deleted: true };
  }

  // ─── Account groups ──────────────────────────────────────────────────────

  async createGroup(dto: CreateAccountGroupDto) {
    const tenantId = this.getTenantId();
    await this.assertClassBelongsToTenant(dto.accountClassId, tenantId);

    const existing = await this.accountGroupRepo.findOne({
      where: { tenant_id: tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Account group code "${dto.code}" already exists.`,
      );
    }
    const entity = this.accountGroupRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      code: dto.code,
      account_class_id: dto.accountClassId,
    });
    return this.accountGroupRepo.save(entity);
  }

  async updateGroup(id: string, dto: UpdateAccountGroupDto) {
    const tenantId = this.getTenantId();
    const entity = await this.accountGroupRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("Account group not found.");

    if (dto.accountClassId !== undefined) {
      await this.assertClassBelongsToTenant(dto.accountClassId, tenantId);
      entity.account_class_id = dto.accountClassId;
    }
    if (dto.code && dto.code !== entity.code) {
      const clash = await this.accountGroupRepo.findOne({
        where: { tenant_id: tenantId, code: dto.code },
      });
      if (clash) {
        throw new ConflictException(
          `Account group code "${dto.code}" already exists.`,
        );
      }
      entity.code = dto.code;
    }
    if (dto.name !== undefined) entity.name = dto.name;
    return this.accountGroupRepo.save(entity);
  }

  async deleteGroup(id: string) {
    const tenantId = this.getTenantId();
    const entity = await this.accountGroupRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("Account group not found.");

    const accounts = await this.glAccountRepo.count({
      where: { tenant_id: tenantId, account_group_id: id },
    });
    if (accounts > 0) {
      throw new ConflictException(
        "Cannot delete an account group that still has GL accounts.",
      );
    }
    await this.accountGroupRepo.remove(entity);
    return { deleted: true };
  }

  // ─── GL accounts ─────────────────────────────────────────────────────────

  async createAccount(dto: CreateGlAccountDto) {
    const tenantId = this.getTenantId();
    await this.assertGroupBelongsToTenant(dto.accountGroupId, tenantId);

    const existing = await this.glAccountRepo.findOne({
      where: { tenant_id: tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `GL account code "${dto.code}" already exists.`,
      );
    }
    const entity = this.glAccountRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      account_group_id: dto.accountGroupId,
      is_active: dto.isActive ?? true,
    });
    return this.glAccountRepo.save(entity);
  }

  async updateAccount(id: string, dto: UpdateGlAccountDto) {
    const tenantId = this.getTenantId();
    const entity = await this.glAccountRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("GL account not found.");

    if (dto.accountGroupId !== undefined) {
      await this.assertGroupBelongsToTenant(dto.accountGroupId, tenantId);
      entity.account_group_id = dto.accountGroupId;
    }
    if (dto.code && dto.code !== entity.code) {
      const clash = await this.glAccountRepo.findOne({
        where: { tenant_id: tenantId, code: dto.code },
      });
      if (clash) {
        throw new ConflictException(
          `GL account code "${dto.code}" already exists.`,
        );
      }
      entity.code = dto.code;
    }
    if (dto.name !== undefined) entity.name = dto.name;
    if (dto.description !== undefined)
      entity.description = dto.description ?? null;
    if (dto.isActive !== undefined) entity.is_active = dto.isActive;
    return this.glAccountRepo.save(entity);
  }

  async deleteAccount(id: string) {
    const tenantId = this.getTenantId();
    const entity = await this.glAccountRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entity) throw new NotFoundException("GL account not found.");

    if (await this.isAccountReferenced(tenantId, id)) {
      throw new ConflictException(
        "GL account is referenced by journal lines; deactivate it instead of deleting.",
      );
    }
    await this.glAccountRepo.remove(entity);
    return { deleted: true };
  }

  // ─── Default chart seeding ───────────────────────────────────────────────

  /**
   * Idempotently seed the default chart of accounts for a tenant. Safe to call
   * repeatedly (matches existing rows by code). Accepts an optional
   * EntityManager so it can participate in a caller's transaction.
   */
  /** Seed the default chart for the current request's tenant. */
  async seedDefaults(): Promise<{ seeded: true }> {
    const tenantId = this.getTenantId();
    await this.ensureDefaultChartOfAccounts(tenantId);
    return { seeded: true };
  }

  async ensureDefaultChartOfAccounts(
    tenantId: string,
    manager?: EntityManager,
  ): Promise<void> {
    if (manager) {
      await this.seedWithManager(manager, tenantId);
      return;
    }
    await this.dataSource.transaction((m) => this.seedWithManager(m, tenantId));
  }

  private async seedWithManager(
    manager: EntityManager,
    tenantId: string,
  ): Promise<void> {
    for (const cls of DEFAULT_CHART_OF_ACCOUNTS) {
      let classRow = await manager.findOne(AccountClassEntity, {
        where: { tenant_id: tenantId, code: cls.code },
      });
      if (!classRow) {
        classRow = await manager.save(
          manager.create(AccountClassEntity, {
            tenant_id: tenantId,
            name: cls.name,
            code: cls.code,
            base_type: cls.baseType,
          }),
        );
      }

      for (const grp of cls.groups) {
        let groupRow = await manager.findOne(AccountGroupEntity, {
          where: { tenant_id: tenantId, code: grp.code },
        });
        if (!groupRow) {
          groupRow = await manager.save(
            manager.create(AccountGroupEntity, {
              tenant_id: tenantId,
              name: grp.name,
              code: grp.code,
              account_class_id: classRow.id,
            }),
          );
        }

        for (const acc of grp.accounts) {
          const existing = await manager.findOne(GLAccountEntity, {
            where: { tenant_id: tenantId, code: acc.code },
          });
          if (!existing) {
            await manager.save(
              manager.create(GLAccountEntity, {
                tenant_id: tenantId,
                name: acc.name,
                code: acc.code,
                description: acc.description ?? null,
                account_group_id: groupRow.id,
                is_active: true,
              }),
            );
          }
        }
      }
    }
    this.logger.log(
      `[FINANCE-CORE] Default chart of accounts ensured for tenant ${tenantId}`,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async assertClassBelongsToTenant(classId: string, tenantId: string) {
    const found = await this.accountClassRepo.findOne({
      where: { id: classId, tenant_id: tenantId },
    });
    if (!found) throw new NotFoundException("Account class not found.");
  }

  private async assertGroupBelongsToTenant(groupId: string, tenantId: string) {
    const found = await this.accountGroupRepo.findOne({
      where: { id: groupId, tenant_id: tenantId },
    });
    if (!found) throw new NotFoundException("Account group not found.");
  }

  private async isAccountReferenced(
    tenantId: string,
    accountId: string,
  ): Promise<boolean> {
    try {
      const rows = await this.dataSource.query(
        `SELECT 1 FROM "gl_journal_line" WHERE "tenant_id" = $1 AND "gl_account_id" = $2 LIMIT 1`,
        [tenantId, accountId],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      // Table may not exist on extremely fresh tenants; treat as unreferenced.
      this.logger.debug(
        `Reference check for GL account ${accountId} skipped: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
