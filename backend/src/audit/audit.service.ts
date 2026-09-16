import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, Between, Like, DataSource } from "typeorm";
import { AuditLogEntity } from "./audit.entity";
import { GetAuditLogsDto } from "./dto/get-audit-logs.dto";
import { CorrelatedLogger } from "../common/logger/correlated-logger";

@Injectable()
export class AuditService {
  private readonly logger = new CorrelatedLogger(AuditService.name); // CHANGED: Use CorrelatedLogger

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
    private dataSource: DataSource,
  ) {}

  /**
   * Writes a platform-scoped (tenantId null) audit row under an explicit SYS
   * RLS context (Flaw D, SYS-WRITE path).
   *
   * WHY THIS EXISTS: RLS WITH CHECK on audit_log requires the row's tenant to
   * equal the session tenant — a tenant-scoped request connection can never
   * insert a platform row, by design. The only legitimate null-tenant writes
   * are system-initiated events with no attributable tenant (rejected/anonymous
   * auth attempts, reuse detection whose owner no longer resolves). Those go
   * through here, on a dedicated runner whose session is SET to SYS.
   *
   * GREP CONTRACT: this method is the ONLY place that writes with elevated
   * trust. `logSysWrite(` is the searchable marker for every elevated audit
   * write in the codebase — audit it by searching for the name.
   *
   * NEVER call this on a per-request path with a knowable tenant. If you know
   * the tenant, pass it to log() instead.
   */
  async logSysWrite(
    userId: string | null,
    action: string,
    description: string,
    details?: Record<string, any>,
    userEmail?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      // Explicit SYS elevation on a dedicated connection — forced regardless
      // of ambient CLS state, so this write never inherits a tenant scope.
      await queryRunner.query(`SET app.current_tenant_id = 'SYS'`);
      const repo = queryRunner.manager.getRepository(AuditLogEntity);
      const auditLog = repo.create({
        userId: userId,
        userEmail: userEmail ?? null,
        action: action,
        targetType: details?.targetType || null,
        targetId: details?.targetId || null,
        details: { ...details, description, userAgent, sysWrite: true },
        ipAddress: ipAddress ?? null,
        tenantId: null,
        actionType: action,
        timestamp: new Date(),
      });
      await repo.save(auditLog);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to save SYS audit log event for action: ${action} by user: ${userEmail}`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Logs an audit event with comprehensive details.
   * This is the primary method for other services to log audit events.
   *
   * KNOWABLE-TENANT RULE (Flaw D): pass the tenant whenever it is known.
   * tenantId null is reserved for genuinely unattributable events — those
   * must use logSysWrite(), which runs under an explicit SYS RLS context.
   * A null tenantId here on a tenant-scoped connection WILL be rejected by
   * the RLS WITH CHECK policy (fail-loud, by design).
   */
  async log(
    userId: string | null,
    action: string,
    tenantId: string | null,
    description: string,
    details?: Record<string, any>, // Use Record<string, any> for flexibility
    userEmail?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    actingUserEmail?: string | null, // Added for createUser audit
  ): Promise<void> {
    // Changed return type to void as it's fire-and-forget
    const auditLog = this.auditLogRepository.create({
      userId: userId,
      userEmail: userEmail,
      action: action,
      targetType: details?.targetType || null, // Extract targetType from details if present
      targetId: details?.targetId || null, // Extract targetId from details if present
      details: { ...details, description, userAgent, actingUserEmail }, // Merge description and userAgent into details
      ipAddress: ipAddress,
      tenantId: tenantId,
      actionType: action, // actionType is same as action
      timestamp: new Date(),
    });

    // Fire and forget, audit logging should not block main application flow
    this.auditLogRepository.save(auditLog).catch((error: unknown) => {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to save audit log event for action: ${action} by user: ${userEmail}`,
          error.stack,
          JSON.stringify({
            userId,
            action,
            tenantId,
            description,
            details,
            userEmail,
            ipAddress,
            userAgent,
          }),
        );
      } else {
        this.logger.error(
          `Failed to save audit log event for action: ${action} by user: ${userEmail}`,
          String(error),
          JSON.stringify({
            userId,
            action,
            tenantId,
            description,
            details,
            userEmail,
            ipAddress,
            userAgent,
          }),
        );
      }
    });
  }

  async findAuditLogs(
    options: GetAuditLogsDto,
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      userId,
      action,
      targetType,
      tenantId,
      userEmail,
      ipAddress,
    } = options;

    // Enforce maximum limit to prevent memory issues
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: FindManyOptions<AuditLogEntity>["where"] = {};

    // Apply filters
    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = Like(`%${action}%`); // Partial match for action
    }
    if (targetType) {
      where.targetType = targetType;
    }
    if (userEmail) {
      where.userEmail = Like(`%${userEmail}%`);
    }
    if (ipAddress) {
      where.ipAddress = ipAddress;
    }

    if (startDate || endDate) {
      where.timestamp = Between(
        startDate ? new Date(startDate) : new Date(0), // From epoch if no start date
        endDate
          ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
          : new Date(), // To end of day or now
      );
    }

    // Filter by tenantId (if provided)
    if (tenantId !== undefined) {
      where.tenantId = tenantId as any;
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: "DESC" },
      skip: skip,
      take: safeLimit,
    });

    return { logs, total };
  }
}
