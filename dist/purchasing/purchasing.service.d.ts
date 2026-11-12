import { Repository } from 'typeorm';
import { PurchaseRequest, PurchaseRequestItem, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem, ApprovalWorkflow, ApprovalStep, ApprovalHistory, Product, Supplier, User } from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class PurchasingService {
    private prRepo;
    private prItemRepo;
    private poRepo;
    private poItemRepo;
    private grRepo;
    private grItemRepo;
    private workflowRepo;
    private stepRepo;
    private historyRepo;
    private productRepo;
    private supplierRepo;
    private userRepo;
    private notificationsService;
    private auditService;
    constructor(prRepo: Repository<PurchaseRequest>, prItemRepo: Repository<PurchaseRequestItem>, poRepo: Repository<PurchaseOrder>, poItemRepo: Repository<PurchaseOrderItem>, grRepo: Repository<GoodsReceipt>, grItemRepo: Repository<GoodsReceiptItem>, workflowRepo: Repository<ApprovalWorkflow>, stepRepo: Repository<ApprovalStep>, historyRepo: Repository<ApprovalHistory>, productRepo: Repository<Product>, supplierRepo: Repository<Supplier>, userRepo: Repository<User>, notificationsService: NotificationsService, auditService: AuditService);
    findPRs(): Promise<PurchaseRequest[]>;
    findPR(id: string): Promise<PurchaseRequest>;
    createPR(user: User, itemsDto: Array<{
        productId: string;
        quantity: number;
        estimatedPrice: number;
    }>): Promise<PurchaseRequest>;
    submitPR(id: string, user: User): Promise<PurchaseRequest>;
    approvePR(id: string, comment: string, user: User): Promise<PurchaseRequest>;
    rejectPR(id: string, comment: string, user: User): Promise<PurchaseRequest>;
    findPOs(): Promise<PurchaseOrder[]>;
    findPO(id: string): Promise<PurchaseOrder>;
    private generatePOFromPR;
    findGRs(): Promise<GoodsReceipt[]>;
    findGR(id: string): Promise<GoodsReceipt>;
    createGR(poId: string, receivedById: string, itemsDto: Array<{
        productId: string;
        quantityReceived: number;
    }>): Promise<GoodsReceipt>;
    private logApprovalHistory;
    getApprovalHistory(entityType: string, entityId: string): Promise<ApprovalHistory[]>;
}
