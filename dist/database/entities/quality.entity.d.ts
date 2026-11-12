import { User } from './rbac.entity';
import { Product } from './master.entity';
import { WorkOrder } from './production.entity';
import { GoodsReceipt } from './purchasing-inventory.entity';
export declare enum QAStatus {
    PASS = "PASS",
    FAIL = "FAIL",
    REWORK = "REWORK"
}
export declare class QualityInspection {
    id: string;
    code: string;
    product: Product;
    workOrder: WorkOrder | null;
    goodsReceipt: GoodsReceipt | null;
    batchNo: string;
    inspector: User;
    weight: number | null;
    size: number | null;
    color: string | null;
    temperature: number | null;
    defectDetails: string | null;
    status: QAStatus;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class QualityDefect {
    id: string;
    inspection: QualityInspection;
    defectType: string;
    severity: number;
    description: string;
    createdAt: Date;
}
