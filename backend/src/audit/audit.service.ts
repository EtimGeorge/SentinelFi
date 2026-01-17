import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions, Like } from "typeorm";
import { AuditLogEntity } from "./audit.entity";
import { PaginationDto, DateRangeDto } from "../common/dto/pagination.dto"; // Corrected import path

export interface AuditEvent {
  userId?: string;
  userEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: object;
  ipAddress?: string;
  tenantId?: string; // Tenant context of the action
}

export interface FindAuditLogsOptions {
  // Removed 'extends PaginationDto, DateRangeDto'
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  targetType?: string;
  tenantId?: string | null; // Allow filtering by specific tenant or null for all (SuperAdmin)
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async logEvent(event: AuditEvent): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepository.create({
      userId: event.userId || null,
      userEmail: event.userEmail || null,
      action: event.action,
      targetType: event.targetType || null,
      targetId: event.targetId || null,
      details: event.details || null,
      ipAddress: event.ipAddress || null,
      tenantId: event.tenantId || null,
      actionType: event.action, // For now, action and actionType are same; can be refined
    });

    try {
      return await this.auditLogRepository.save(auditLog);
    } catch (error: unknown) {
      // Explicitly type as unknown
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
      // Depending on policy, might re-throw or just log. For now, we log and suppress to not block main operations.
      return auditLog; // Return the unsaved log to not break the chain
    }
  }

  async findAuditLogs(
    options: FindAuditLogsOptions,
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
    } = options;
    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<AuditLogEntity> = {
      where: {},
      order: { timestamp: "DESC" },
      skip: skip,
      take: limit,
    };

    // Apply filters
    if (userId) {
      (findOptions.where as any).userId = userId;
    }
    if (action) {
      (findOptions.where as any).action = Like(`%${action}%`); // Partial match for action
    }
    if (targetType) {
      (findOptions.where as any).targetType = targetType;
    }
    if (startDate || endDate) {
      (findOptions.where as any).timestamp = {};
      if (startDate) {
        (findOptions.where as any).timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        // Add a day to include the end date fully
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        (findOptions.where as any).timestamp.lt = end;
      }
    }
    // Filter by tenantId (if provided)
    if (tenantId !== undefined) {
      (findOptions.where as any).tenantId = tenantId;
    }

    const [logs, total] =
      await this.auditLogRepository.findAndCount(findOptions);

    return { logs, total };
  }
}
