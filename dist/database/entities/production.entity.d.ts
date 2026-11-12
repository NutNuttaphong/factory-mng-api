import { User } from './rbac.entity';
import { Product, Warehouse } from './master.entity';
export declare enum WorkOrderStatus {
    DRAFT = "DRAFT",
    PENDING_MATERIAL = "PENDING_MATERIAL",
    MATERIAL_ISSUED = "MATERIAL_ISSUED",
    IN_PRODUCTION = "IN_PRODUCTION",
    PENDING_QA = "PENDING_QA",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class ProductionPlan {
    id: string;
    code: string;
    product: Product;
    targetQuantity: number;
    startDate: Date;
    endDate: Date;
    status: string;
    workOrders: WorkOrder[];
    createdAt: Date;
}
export declare class WorkOrder {
    id: string;
    code: string;
    productionPlan: ProductionPlan | null;
    product: Product;
    quantity: number;
    status: WorkOrderStatus;
    assignedTo: User;
    createdAt: Date;
    updatedAt: Date;
}
export declare class MaterialIssue {
    id: string;
    code: string;
    workOrder: WorkOrder;
    warehouse: Warehouse;
    issuedBy: User;
    items: Array<{
        productId: string;
        productCode: string;
        productName: string;
        quantityRequired: number;
        quantityIssued: number;
    }>;
    createdAt: Date;
}
export declare class ProductionResult {
    id: string;
    code: string;
    workOrder: WorkOrder;
    quantityProduced: number;
    quantityDefective: number;
    operator: User;
    notes: string;
    createdAt: Date;
}
