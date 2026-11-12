import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/workflow-audit.entity';
export declare class AuditService {
    private auditRepo;
    constructor(auditRepo: Repository<AuditLog>);
    log(params: {
        action: string;
        entityName: string;
        entityId: string;
        beforeState?: any;
        afterState?: any;
        userEmail?: string;
        ipAddress?: string;
    }): Promise<AuditLog>;
    findAll(): Promise<AuditLog[]>;
}
