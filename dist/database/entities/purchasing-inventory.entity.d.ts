import { User } from './rbac.entity';
import { Product, Supplier, Warehouse } from './master.entity';
export declare enum ApprovalStatus {
    DRAFT = "DRAFT",
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED"
}
export declare class PurchaseRequest {
    id: string;
    code: string;
    requester: User;
    status: ApprovalStatus;
    totalAmount: number;
    items: PurchaseRequestItem[];
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PurchaseRequestItem {
    id: string;
    purchaseRequest: PurchaseRequest;
    product: Product;
    quantity: number;
    estimatedPrice: number;
    totalPrice: number;
}
export declare class PurchaseOrder {
    id: string;
    code: string;
    supplier: Supplier;
    buyer: User;
    status: ApprovalStatus;
    totalAmount: number;
    items: PurchaseOrderItem[];
    purchaseRequest: PurchaseRequest;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class PurchaseOrderItem {
    id: string;
    purchaseOrder: PurchaseOrder;
    product: Product;
    quantity: number;
    price: number;
    totalPrice: number;
}
export declare enum GoodsReceiptStatus {
    PENDING_QA = "PENDING_QA",
    QA_PASSED = "QA_PASSED",
    QA_FAILED = "QA_FAILED",
    STOCKED = "STOCKED"
}
export declare class GoodsReceipt {
    id: string;
    code: string;
    purchaseOrder: PurchaseOrder;
    receivedBy: User;
    status: GoodsReceiptStatus;
    items: GoodsReceiptItem[];
    createdAt: Date;
}
export declare class GoodsReceiptItem {
    id: string;
    goodsReceipt: GoodsReceipt;
    product: Product;
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
}
export declare class Stock {
    id: string;
    product: Product;
    warehouse: Warehouse;
    quantity: number;
    status: string;
    updatedAt: Date;
}
export declare enum StockMovementType {
    STOCK_IN = "STOCK_IN",
    STOCK_OUT = "STOCK_OUT",
    TRANSFER = "TRANSFER",
    ADJUSTMENT = "ADJUSTMENT",
    RETURN = "RETURN"
}
export declare class StockMovement {
    id: string;
    type: StockMovementType;
    product: Product;
    fromWarehouse: Warehouse | null;
    toWarehouse: Warehouse | null;
    quantity: number;
    referenceType: string;
    referenceId: string;
    user: User;
    createdAt: Date;
}
export declare class BOM {
    id: string;
    code: string;
    product: Product;
    description: string;
    items: BOMItem[];
    isActive: boolean;
    createdAt: Date;
}
export declare class BOMItem {
    id: string;
    bom: BOM;
    product: Product;
    quantityNeeded: number;
}
