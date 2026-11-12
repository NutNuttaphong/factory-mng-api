import { QualityService } from './quality.service';
import { User, QAStatus } from '../database/entities';
export declare class QualityController {
    private service;
    constructor(service: QualityService);
    getInspections(): Promise<import("../database/entities").QualityInspection[]>;
    getDefects(): Promise<import("../database/entities").QualityDefect[]>;
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
    }): Promise<import("../database/entities").QualityInspection>;
}
