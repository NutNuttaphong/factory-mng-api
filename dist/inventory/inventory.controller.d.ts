import { InventoryService } from './inventory.service';
import { User } from '../database/entities';
export declare class InventoryController {
    private service;
    constructor(service: InventoryService);
    getStocks(): Promise<import("../database/entities").Stock[]>;
    getMovements(): Promise<import("../database/entities").StockMovement[]>;
    stockIn(user: User, body: {
        productId: string;
        warehouseId: string;
        quantity: number;
        referenceType: string;
        referenceId: string;
    }): Promise<import("../database/entities").Stock>;
    stockOut(user: User, body: {
        productId: string;
        warehouseId: string;
        quantity: number;
        referenceType: string;
        referenceId: string;
    }): Promise<import("../database/entities").Stock>;
    transfer(user: User, body: {
        productId: string;
        fromWarehouseId: string;
        toWarehouseId: string;
        quantity: number;
    }): Promise<{
        sourceStock: import("../database/entities").Stock;
        targetStock: import("../database/entities").Stock;
    }>;
    adjust(user: User, body: {
        productId: string;
        warehouseId: string;
        quantity: number;
    }): Promise<import("../database/entities").Stock | null>;
}
