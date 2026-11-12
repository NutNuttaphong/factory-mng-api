import { User, Role } from './rbac.entity';
export declare class ApprovalWorkflow {
    id: string;
    targetType: string;
    minAmount: number;
    maxAmount: number;
    isActive: boolean;
    createdAt: Date;
}
export declare class ApprovalStep {
    id: string;
    workflow: ApprovalWorkflow;
    stepOrder: number;
    role: Role;
}
export declare class ApprovalHistory {
    id: string;
    entityType: string;
    entityId: string;
    user: User;
    action: string;
    comment: string;
    previousStatus: string;
    newStatus: string;
    createdAt: Date;
}
export declare class AuditLog {
    id: string;
    userEmail: string | null;
    action: string;
    entityName: string;
    entityId: string;
    beforeState: string | null;
    afterState: string | null;
    ipAddress: string | null;
    createdAt: Date;
}
export declare class Notification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    recipientRole: string;
    recipientId: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
}
