import { Repository } from 'typeorm';
import { SalesOrder, SalesOrderItem, Delivery, Product, Customer, User, Stock } from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class SalesService {
    private soRepo;
    private soItemRepo;
    private deliveryRepo;
    private customerRepo;
    private productRepo;
    private stockRepo;
    private inventoryService;
    private notificationsService;
    private auditService;
    constructor(soRepo: Repository<SalesOrder>, soItemRepo: Repository<SalesOrderItem>, deliveryRepo: Repository<Delivery>, customerRepo: Repository<Customer>, productRepo: Repository<Product>, stockRepo: Repository<Stock>, inventoryService: InventoryService, notificationsService: NotificationsService, auditService: AuditService);
    findOrders(): Promise<SalesOrder[]>;
    findOrder(id: string): Promise<SalesOrder>;
    createOrder(user: User, customerId: string, itemsDto: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>): Promise<SalesOrder>;
    reserveStock(orderId: string, user: User): Promise<SalesOrder>;
    createDelivery(orderId: string, user: User): Promise<Delivery>;
    findDeliveries(): Promise<Delivery[]>;
}
