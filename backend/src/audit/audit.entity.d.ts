export declare class AuditLogEntity {
    id: string;
    timestamp: Date;
    userId: string | null;
    userEmail: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: object | null;
    ipAddress: string | null;
    tenantId: string | null;
    actionType: string;
}
