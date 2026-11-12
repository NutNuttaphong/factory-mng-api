import { Repository } from 'typeorm';
import { ProductionPlan, WorkOrder, MaterialIssue, ProductionResult, BOM, BOMItem, Product, Warehouse, User, Stock } from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class ProductionService {
    private planRepo;
    private woRepo;
    private issueRepo;
    private resultRepo;
    private bomRepo;
    private bomItemRepo;
    private productRepo;
    private warehouseRepo;
    private stockRepo;
    private userRepo;
    private inventoryService;
    private notificationsService;
    private auditService;
    constructor(planRepo: Repository<ProductionPlan>, woRepo: Repository<WorkOrder>, issueRepo: Repository<MaterialIssue>, resultRepo: Repository<ProductionResult>, bomRepo: Repository<BOM>, bomItemRepo: Repository<BOMItem>, productRepo: Repository<Product>, warehouseRepo: Repository<Warehouse>, stockRepo: Repository<Stock>, userRepo: Repository<User>, inventoryService: InventoryService, notificationsService: NotificationsService, auditService: AuditService);
    findBOMs(): Promise<BOM[]>;
    createBOM(dto: {
        code: string;
        productId: string;
        description?: string;
        items: Array<{
            productId: string;
            quantityNeeded: number;
        }>;
    }): Promise<BOM>;
    findPlans(): Promise<ProductionPlan[]>;
    createPlan(dto: {
        productId: string;
        targetQuantity: number;
        startDate: Date;
        endDate: Date;
    }): Promise<ProductionPlan>;
    findWorkOrders(): Promise<WorkOrder[]>;
    findWorkOrder(id: string): Promise<WorkOrder>;
    createWorkOrder(dto: {
        productionPlanId?: string;
        productId: string;
        quantity: number;
        assignedToId: string;
    }): Promise<WorkOrder>;
    checkMaterialRequirement(woId: string): Promise<{
        workOrderId: string;
        workOrderCode: string;
        productCode: string;
        productName: string;
        targetQty: number;
        allAvailable: boolean;
        requirements: {
            productId: string;
            code: string;
            name: string;
            requiredQty: number;
            availableQty: number;
            isAvailable: boolean;
        }[];
    }>;
    issueMaterials(woId: string, warehouseId: string, user: User): Promise<MaterialIssue>;
    startProduction(woId: string): Promise<WorkOrder>;
    reportResult(woId: string, qtyProduced: number, qtyDefective: number, notes: string, user: User): Promise<ProductionResult>;
}
