import { SalesService } from './sales.service';
import { User } from '../database/entities';
export declare class SalesController {
    private service;
    constructor(service: SalesService);
    getOrders(): Promise<import("../database/entities").SalesOrder[]>;
    getOrder(id: string): Promise<import("../database/entities").SalesOrder>;
    createOrder(user: User, body: {
        customerId: string;
        items: Array<{
            productId: string;
            quantity: number;
            price: number;
        }>;
    }): Promise<import("../database/entities").SalesOrder>;
    reserveStock(id: string, user: User): Promise<import("../database/entities").SalesOrder>;
    createDelivery(id: string, user: User): Promise<import("../database/entities").Delivery>;
    getDeliveries(): Promise<import("../database/entities").Delivery[]>;
}
