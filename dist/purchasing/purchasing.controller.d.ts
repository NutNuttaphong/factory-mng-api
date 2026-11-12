import { PurchasingService } from './purchasing.service';
import { User } from '../database/entities';
export declare class PurchasingController {
    private service;
    constructor(service: PurchasingService);
    getPRs(): Promise<import("../database/entities").PurchaseRequest[]>;
    getPR(id: string): Promise<import("../database/entities").PurchaseRequest>;
    createPR(user: User, body: {
        items: Array<{
            productId: string;
            quantity: number;
            estimatedPrice: number;
        }>;
    }): Promise<import("../database/entities").PurchaseRequest>;
    submitPR(id: string, user: User): Promise<import("../database/entities").PurchaseRequest>;
    approvePR(id: string, body: {
        comment: string;
    }, user: User): Promise<import("../database/entities").PurchaseRequest>;
    rejectPR(id: string, body: {
        comment: string;
    }, user: User): Promise<import("../database/entities").PurchaseRequest>;
    getHistory(id: string): Promise<import("../database/entities").ApprovalHistory[]>;
    getPOs(): Promise<import("../database/entities").PurchaseOrder[]>;
    getPO(id: string): Promise<import("../database/entities").PurchaseOrder>;
    getGRs(): Promise<import("../database/entities").GoodsReceipt[]>;
    createGR(user: User, body: {
        poId: string;
        items: Array<{
            productId: string;
            quantityReceived: number;
        }>;
    }): Promise<import("../database/entities").GoodsReceipt>;
}
