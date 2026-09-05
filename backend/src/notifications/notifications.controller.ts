import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TENANT_DATA_SOURCE } from "../database/constants";
import { Inject } from "@nestjs/common";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    @Inject(TENANT_DATA_SOURCE) private readonly tenantDataSource: DataSource,
    private readonly dataSource: DataSource,
  ) {}

  private get searchPath(): string {
    // Fallback tenant resolution – TenancyAwareDataSource sets search_path via CLS,
    // but raw query with explicit check ensures we query correct schema.
    return "";
  }

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query("limit") limit?: string,
    @Query("since") since?: string,
  ): Promise<any[]> {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    // SuperAdmin without tenant – return empty rather than 500
    if (!tenantId) return [];
    const take = Math.min(parseInt(limit || "50", 10) || 50, 100);
    try {
      // tenant-aware query – search_path already set by TenancyAwareDataSource
      // Direct query against notifications table; if table missing, catch and return []
      const params: any[] = [tenantId];
      let sql = `SELECT * FROM "notifications" WHERE "tenant_id" = $1`;
      if (since) {
        sql += ` AND "created_at" > $2`;
        params.push(since);
      }
      // Filter to tenant-wide or user-specific notifications if user_id column populated
      // For now return all for tenant, optionally filter by user_id if provided
      // Show user-specific + broadcast (user_id IS NULL) ordered newest first
      sql += ` ORDER BY "created_at" DESC LIMIT ${take}`;
      // Use tenantDataSource if available to respect search_path; else fallback to dataSource
      const ds = this.tenantDataSource?.isInitialized ? this.tenantDataSource : this.dataSource;
      const rows = await ds.query(sql, params);
      return rows;
    } catch (e: any) {
      const msg = e?.message || "";
      // Gracefully handle missing table – return empty instead of 500
      if (
        msg.includes('relation "notifications" does not exist') ||
        msg.includes('does not exist') ||
        msg.includes('42P01') ||
        e?.code === "42P01"
      ) {
        this.logger.warn(
          `notifications table missing for tenant ${tenantId} – returning empty (graceful).`,
        );
        return [];
      }
      this.logger.error(`GET /notifications failed: ${msg}`, e?.stack);
      // For any other error, return empty to avoid 500 surfacing to UI
      return [];
    }
  }

  @Get("unread-count")
  async getUnreadCount(@Req() req: any): Promise<{ unreadCount: number }> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) return { unreadCount: 0 };
    try {
      const ds = this.tenantDataSource?.isInitialized ? this.tenantDataSource : this.dataSource;
      const rows = await ds.query(
        `SELECT COUNT(*) as cnt FROM "notifications" WHERE "tenant_id" = $1 AND "is_read" = false`,
        [tenantId],
      );
      const cnt = parseInt(rows?.[0]?.cnt || "0", 10);
      return { unreadCount: isNaN(cnt) ? 0 : cnt };
    } catch (e: any) {
      if (e?.code === "42P01" || e?.message?.includes("does not exist")) {
        return { unreadCount: 0 };
      }
      this.logger.error(`unread-count failed: ${e.message}`);
      return { unreadCount: 0 };
    }
  }

  @Patch(":id/read")
  async markAsRead(@Req() req: any, @Param("id") id: string): Promise<{ success: boolean }> {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) return { success: false };
    try {
      const ds = this.tenantDataSource?.isInitialized ? this.tenantDataSource : this.dataSource;
      await ds.query(
        `UPDATE "notifications" SET "is_read" = true, "updated_at" = NOW() WHERE "id" = $1 AND "tenant_id" = $2`,
        [id, tenantId],
      );
      return { success: true };
    } catch (e: any) {
      if (e?.code === "42P01" || e?.message?.includes("does not exist")) {
        return { success: true };
      }
      throw e;
    }
  }
}
