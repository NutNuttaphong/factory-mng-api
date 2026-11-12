import { ProductionService } from './production.service';
import { User } from '../database/entities';
export declare class ProductionController {
    private service;
    constructor(service: ProductionService);
    getBOMs(): Promise<import("../database/entities").BOM[]>;
    createBOM(dto: any): Promise<import("../database/entities").BOM>;
    getPlans(): Promise<import("../database/entities").ProductionPlan[]>;
    createPlan(dto: {
        productId: string;
        targetQuantity: number;
        startDate: Date;
        endDate: Date;
    }): Promise<import("../database/entities").ProductionPlan>;
    getWorkOrders(): Promise<import("../database/entities").WorkOrder[]>;
    createWorkOrder(dto: {
        productionPlanId?: string;
        productId: string;
        quantity: number;
        assignedToId: string;
    }): Promise<import("../database/entities").WorkOrder>;
    getWorkOrder(id: string): Promise<import("../database/entities").WorkOrder>;
    checkRequirements(id: string): Promise<{
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
    issueMaterials(id: string, body: {
        warehouseId: string;
    }, user: User): Promise<import("../database/entities").MaterialIssue>;
    startProduction(id: string): Promise<import("../database/entities").WorkOrder>;
    reportResult(id: string, body: {
        qtyProduced: number;
        qtyDefective: number;
        notes: string;
    }, user: User): Promise<import("../database/entities").ProductionResult>;
}
