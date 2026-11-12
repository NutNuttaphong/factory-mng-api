import { AuditService } from './audit.service';
export declare class AuditController {
    private auditService;
    constructor(auditService: AuditService);
    findAll(): Promise<import("../database/entities").AuditLog[]>;
}
