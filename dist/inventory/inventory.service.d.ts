import { Repository } from 'typeorm';
import { Stock, StockMovement } from '../database/entities/purchasing-inventory.entity';
import { Product, Warehouse } from '../database/entities/master.entity';
import { User } from '../database/entities/rbac.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
export declare class InventoryService {
    private stockRepo;
    private movementRepo;
    private productRepo;
    private warehouseRepo;
    private notificationsService;
    private auditService;
    constructor(stockRepo: Repository<Stock>, movementRepo: Repository<StockMovement>, productRepo: Repository<Product>, warehouseRepo: Repository<Warehouse>, notificationsService: NotificationsService, auditService: AuditService);
    getStockOverview(): Promise<Stock[]>;
    getMovements(): Promise<StockMovement[]>;
    stockIn(productId: string, warehouseId: string, quantity: number, referenceType: string, referenceId: string, user: User): Promise<Stock>;
    stockOut(productId: string, warehouseId: string, quantity: number, referenceType: string, referenceId: string, user: User): Promise<Stock>;
    transfer(productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number, user: User): Promise<{
        sourceStock: Stock;
        targetStock: Stock;
    }>;
    adjust(productId: string, warehouseId: string, newQuantity: number, user: User): Promise<Stock | null>;
    private computeStockStatus;
    private checkLowStockAlert;
}
