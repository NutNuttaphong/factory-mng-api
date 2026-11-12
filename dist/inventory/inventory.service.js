"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const purchasing_inventory_entity_1 = require("../database/entities/purchasing-inventory.entity");
const master_entity_1 = require("../database/entities/master.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
let InventoryService = class InventoryService {
    stockRepo;
    movementRepo;
    productRepo;
    warehouseRepo;
    notificationsService;
    auditService;
    constructor(stockRepo, movementRepo, productRepo, warehouseRepo, notificationsService, auditService) {
        this.stockRepo = stockRepo;
        this.movementRepo = movementRepo;
        this.productRepo = productRepo;
        this.warehouseRepo = warehouseRepo;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async getStockOverview() {
        return this.stockRepo.find({
            relations: { product: { category: true, unit: true }, warehouse: true },
            order: { product: { code: 'ASC' } }
        });
    }
    async getMovements() {
        return this.movementRepo.find({
            relations: { product: true, fromWarehouse: true, toWarehouse: true, user: true },
            order: { createdAt: 'DESC' }
        });
    }
    async stockIn(productId, warehouseId, quantity, referenceType, referenceId, user) {
        if (quantity <= 0)
            throw new common_1.BadRequestException('Quantity must be greater than zero');
        const product = await this.productRepo.findOneBy({ id: productId });
        const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });
        if (!product || !warehouse)
            throw new common_1.NotFoundException('Product or Warehouse not found');
        let stock = await this.stockRepo.findOne({
            where: { product: { id: productId }, warehouse: { id: warehouseId } }
        });
        if (!stock) {
            stock = this.stockRepo.create({
                product,
                warehouse,
                quantity: 0,
                status: 'OUT'
            });
        }
        stock.quantity += quantity;
        stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
        await this.stockRepo.save(stock);
        const movement = this.movementRepo.create({
            type: purchasing_inventory_entity_1.StockMovementType.STOCK_IN,
            product,
            toWarehouse: warehouse,
            quantity,
            referenceType,
            referenceId,
            user
        });
        await this.movementRepo.save(movement);
        await this.auditService.log({
            action: 'STOCK_IN',
            entityName: 'Stock',
            entityId: stock.id,
            afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
            userEmail: user.email
        });
        await this.checkLowStockAlert(product, stock.quantity);
        return stock;
    }
    async stockOut(productId, warehouseId, quantity, referenceType, referenceId, user) {
        if (quantity <= 0)
            throw new common_1.BadRequestException('Quantity must be greater than zero');
        const product = await this.productRepo.findOneBy({ id: productId });
        const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });
        if (!product || !warehouse)
            throw new common_1.NotFoundException('Product or Warehouse not found');
        const stock = await this.stockRepo.findOne({
            where: { product: { id: productId }, warehouse: { id: warehouseId } }
        });
        if (!stock || stock.quantity < quantity) {
            throw new common_1.BadRequestException(`Insufficient stock for product ${product.code} in warehouse ${warehouse.code}`);
        }
        stock.quantity -= quantity;
        stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
        await this.stockRepo.save(stock);
        const movement = this.movementRepo.create({
            type: purchasing_inventory_entity_1.StockMovementType.STOCK_OUT,
            product,
            fromWarehouse: warehouse,
            quantity,
            referenceType,
            referenceId,
            user
        });
        await this.movementRepo.save(movement);
        await this.auditService.log({
            action: 'STOCK_OUT',
            entityName: 'Stock',
            entityId: stock.id,
            afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
            userEmail: user.email
        });
        await this.checkLowStockAlert(product, stock.quantity);
        return stock;
    }
    async transfer(productId, fromWarehouseId, toWarehouseId, quantity, user) {
        if (quantity <= 0)
            throw new common_1.BadRequestException('Quantity must be greater than zero');
        if (fromWarehouseId === toWarehouseId)
            throw new common_1.BadRequestException('Source and target warehouses cannot be the same');
        const product = await this.productRepo.findOneBy({ id: productId });
        const fromWh = await this.warehouseRepo.findOneBy({ id: fromWarehouseId });
        const toWh = await this.warehouseRepo.findOneBy({ id: toWarehouseId });
        if (!product || !fromWh || !toWh)
            throw new common_1.NotFoundException('Product, source or target warehouse not found');
        const sourceStock = await this.stockRepo.findOne({
            where: { product: { id: productId }, warehouse: { id: fromWarehouseId } }
        });
        if (!sourceStock || sourceStock.quantity < quantity) {
            throw new common_1.BadRequestException('Insufficient stock in source warehouse');
        }
        sourceStock.quantity -= quantity;
        sourceStock.status = this.computeStockStatus(sourceStock.quantity, product.minimumStock);
        await this.stockRepo.save(sourceStock);
        let targetStock = await this.stockRepo.findOne({
            where: { product: { id: productId }, warehouse: { id: toWarehouseId } }
        });
        if (!targetStock) {
            targetStock = this.stockRepo.create({
                product,
                warehouse: toWh,
                quantity: 0,
                status: 'OUT'
            });
        }
        targetStock.quantity += quantity;
        targetStock.status = this.computeStockStatus(targetStock.quantity, product.minimumStock);
        await this.stockRepo.save(targetStock);
        const movement = this.movementRepo.create({
            type: purchasing_inventory_entity_1.StockMovementType.TRANSFER,
            product,
            fromWarehouse: fromWh,
            toWarehouse: toWh,
            quantity,
            referenceType: 'TRANSFER',
            user
        });
        await this.movementRepo.save(movement);
        await this.auditService.log({
            action: 'STOCK_TRANSFER',
            entityName: 'Stock',
            entityId: product.id,
            afterState: { quantityTransfered: quantity, from: fromWh.code, to: toWh.code },
            userEmail: user.email
        });
        await this.checkLowStockAlert(product, sourceStock.quantity);
        return { sourceStock, targetStock };
    }
    async adjust(productId, warehouseId, newQuantity, user) {
        if (newQuantity < 0)
            throw new common_1.BadRequestException('Stock quantity cannot be negative');
        const product = await this.productRepo.findOneBy({ id: productId });
        const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });
        if (!product || !warehouse)
            throw new common_1.NotFoundException('Product or Warehouse not found');
        let stock = await this.stockRepo.findOne({
            where: { product: { id: productId }, warehouse: { id: warehouseId } }
        });
        const beforeQty = stock ? stock.quantity : 0;
        const difference = newQuantity - beforeQty;
        if (difference === 0)
            return stock;
        if (!stock) {
            stock = this.stockRepo.create({
                product,
                warehouse,
                quantity: 0,
                status: 'OUT'
            });
        }
        stock.quantity = newQuantity;
        stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
        await this.stockRepo.save(stock);
        const movement = this.movementRepo.create({
            type: purchasing_inventory_entity_1.StockMovementType.ADJUSTMENT,
            product,
            fromWarehouse: difference < 0 ? warehouse : null,
            toWarehouse: difference > 0 ? warehouse : null,
            quantity: Math.abs(difference),
            referenceType: 'MANUAL_ADJUST',
            user
        });
        await this.movementRepo.save(movement);
        await this.auditService.log({
            action: 'UPDATE_PRODUCT_STOCK',
            entityName: 'Stock',
            entityId: stock.id,
            beforeState: { quantity: beforeQty },
            afterState: { quantity: newQuantity, adjustedDiff: difference },
            userEmail: user.email
        });
        await this.checkLowStockAlert(product, stock.quantity);
        return stock;
    }
    computeStockStatus(qty, minStock) {
        if (qty <= 0)
            return 'OUT';
        if (qty < minStock)
            return 'LOW';
        return 'NORMAL';
    }
    async checkLowStockAlert(product, quantity) {
        if (quantity <= product.minimumStock) {
            const typeStr = quantity === 0 ? 'out of stock' : 'below minimum stock limit';
            await this.notificationsService.create({
                title: 'Stock Level Alert',
                message: `Material ${product.code} (${product.name}) is ${typeStr}. Current: ${quantity} ${product.unit?.name || 'units'}, Min: ${product.minimumStock}`,
                recipientRole: 'Warehouse',
                entityType: 'STOCK',
                entityId: product.id
            });
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.Stock)),
    __param(1, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.StockMovement)),
    __param(2, (0, typeorm_1.InjectRepository)(master_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(master_entity_1.Warehouse)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map