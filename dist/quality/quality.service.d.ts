import { Repository } from 'typeorm';
import { QualityInspection, QualityDefect, QAStatus } from '../database/entities/quality.entity';
import { WorkOrder } from '../database/entities/production.entity';
import { GoodsReceipt } from '../database/entities/purchasing-inventory.entity';
import { Product } from '../database/entities/master.entity';
import { User } from '../database/entities/rbac.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class QualityService {
    private qaRepo;
    private defectRepo;
    private woRepo;
    private grRepo;
    private productRepo;
    private inventoryService;
    private notificationsService;
    private auditService;
    constructor(qaRepo: Repository<QualityInspection>, defectRepo: Repository<QualityDefect>, woRepo: Repository<WorkOrder>, grRepo: Repository<GoodsReceipt>, productRepo: Repository<Product>, inventoryService: InventoryService, notificationsService: NotificationsService, auditService: AuditService);
    findInspections(): Promise<QualityInspection[]>;
    getDefects(): Promise<QualityDefect[]>;
    createInspection(user: User, dto: {
        productId: string;
        workOrderId?: string;
        goodsReceiptId?: string;
        batchNo: string;
        weight?: number;
        size?: number;
        color?: string;
        temperature?: number;
        defectDetails?: string;
        status: QAStatus;
        comment: string;
        defectsList?: Array<{
            defectType: string;
            severity: number;
            description?: string;
        }>;
    }): Promise<QualityInspection>;
}
