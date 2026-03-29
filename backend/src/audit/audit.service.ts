import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, Between, Like } from "typeorm";
import { AuditLogEntity } from "./audit.entity";
import { GetAuditLogsDto } from "./dto/get-audit-logs.dto";
import { CorrelatedLogger } from "../common/logger/correlated-logger";

@Injectable()
export class AuditService {
  private readonly logger = new CorrelatedLogger(AuditService.name); // CHANGED: Use CorrelatedLogger

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Logs an audit event with comprehensive details.
   * This is the primary method for other services to log audit events.
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
