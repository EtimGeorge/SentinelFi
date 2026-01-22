import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, Between, Like } from "typeorm";
import { AuditLogEntity } from "./audit.entity";
import { GetAuditLogsDto } from './dto/get-audit-logs.dto'; // Import the new DTO

export interface AuditEvent {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: object | null;
  ipAddress?: string | null;
  tenantId?: string | null; // Tenant context of the action
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  /**
   * Primary method for other services to log audit events.
   */
  async logEvent(event: AuditEvent): Promise<void> {
    // For critical logs, we might want to await. For most, fire-and-forget is fine.
    await this.createAndSaveLog(event, false);
  }

  /**
   * Compatibility method for older implementations.
   */
  async log(
    userId: string | null,
    action: string,
    tenantId: string | null,
    description: string,
    details?: object,
    userEmail?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    await this.logEvent({
      userId,
      userEmail,
      action,
      tenantId,
      ipAddress,
      details: { description, ...details, userAgent },
    });
  }

  private async createAndSaveLog(event: AuditEvent, awaitLog: boolean = false): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepository.create({
      userId: event.userId || null,
      userEmail: event.userEmail || null, // Ensure userEmail is set if available
      action: event.action,
      targetType: event.targetType || null,
      targetId: event.targetId || null,
      details: event.details || null,
      ipAddress: event.ipAddress || null, // Ensure ipAddress is set if available
      tenantId: event.tenantId || null,
      actionType: event.action, // Ensure actionType is set
      timestamp: new Date(), // Explicitly set timestamp
    });

    const saveOperation = this.auditLogRepository.save(auditLog).catch((error: unknown) => {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to save audit log event: ${event.action}`,
          error.stack,
          JSON.stringify(event),
        );
      } else {
        this.logger.error(
          `Failed to save audit log event: ${event.action}`,
          String(error),
          JSON.stringify(event),
        );
      }
      return auditLog;
    });

    if (awaitLog) {
      return await saveOperation;
    }

    return auditLog; // Return immediately (fire-and-forget)
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
    const skip = (page - 1) * limit;

    const where: FindManyOptions<AuditLogEntity>['where'] = {};

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
        endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date(), // To end of day or now
      );
    }
    
    // Filter by tenantId (if provided)
    if (tenantId !== undefined) {
      where.tenantId = tenantId as any; 
    }

    const [logs, total] =
      await this.auditLogRepository.findAndCount({
        where,
        order: { timestamp: "DESC" },
        skip: skip,
        take: limit,
      });

    return { logs, total };
  }
}
