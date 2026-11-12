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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const inventory_service_1 = require("../inventory/inventory.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
let SalesService = class SalesService {
    soRepo;
    soItemRepo;
    deliveryRepo;
    customerRepo;
    productRepo;
    stockRepo;
    inventoryService;
    notificationsService;
    auditService;
    constructor(soRepo, soItemRepo, deliveryRepo, customerRepo, productRepo, stockRepo, inventoryService, notificationsService, auditService) {
        this.soRepo = soRepo;
        this.soItemRepo = soItemRepo;
        this.deliveryRepo = deliveryRepo;
        this.customerRepo = customerRepo;
        this.productRepo = productRepo;
        this.stockRepo = stockRepo;
        this.inventoryService = inventoryService;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async findOrders() {
        return this.soRepo.find({
            relations: { customer: true, salesperson: true, items: { product: true } },
            order: { code: 'DESC' }
        });
    }
    async findOrder(id) {
        const order = await this.soRepo.findOne({
            where: { id },
            relations: { customer: true, salesperson: true, items: { product: true } }
        });
        if (!order)
            throw new common_1.NotFoundException('Sales Order not found');
        return order;
    }
    async createOrder(user, customerId, itemsDto) {
        const customer = await this.customerRepo.findOneBy({ id: customerId });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        const orderCount = await this.soRepo.count();
        const code = `SO-2026-${String(orderCount + 1).padStart(5, '0')}`;
        let totalAmount = 0;
        const items = [];
        for (const itemDto of itemsDto) {
            const product = await this.productRepo.findOneBy({ id: itemDto.productId });
            if (!product)
                throw new common_1.NotFoundException(`Product ${itemDto.productId} not found`);
            const totalPrice = itemDto.quantity * itemDto.price;
            totalAmount += totalPrice;
            const item = this.soItemRepo.create({
                product,
                quantity: itemDto.quantity,
                quantityReserved: 0,
                price: itemDto.price,
                totalPrice
            });
            items.push(item);
        }
        const order = this.soRepo.create({
            code,
            customer,
            salesperson: user,
            status: entities_1.SalesOrderStatus.DRAFT,
            totalAmount,
            items
        });
        const savedOrder = await this.soRepo.save(order);
        await this.auditService.log({
            action: 'CREATE_SALES_ORDER',
            entityName: 'SalesOrder',
            entityId: savedOrder.id,
            afterState: { code, totalAmount },
            userEmail: user.email
        });
        return savedOrder;
    }
    async reserveStock(orderId, user) {
        const order = await this.findOrder(orderId);
        if (order.status !== entities_1.SalesOrderStatus.DRAFT && order.status !== entities_1.SalesOrderStatus.PENDING) {
            throw new common_1.BadRequestException('Can only reserve stock for DRAFT or PENDING orders');
        }
        for (const item of order.items) {
            const stock = await this.stockRepo.findOne({
                where: { product: { id: item.product.id } }
            });
            const currentQty = stock ? stock.quantity : 0;
            if (currentQty < item.quantity) {
                order.status = entities_1.SalesOrderStatus.PENDING;
                await this.soRepo.save(order);
                throw new common_1.BadRequestException(`Insufficient stock for product ${item.product.code}. Required: ${item.quantity}, Available: ${currentQty}`);
            }
        }
        for (const item of order.items) {
            item.quantityReserved = item.quantity;
            await this.soItemRepo.save(item);
        }
        order.status = entities_1.SalesOrderStatus.RESERVED;
        const savedOrder = await this.soRepo.save(order);
        await this.notificationsService.create({
            title: 'Stock Reserved',
            message: `Stock has been reserved for Sales Order ${order.code}. Ready for delivery.`,
            recipientRole: 'Warehouse',
            entityType: 'SALES_ORDER',
            entityId: order.id
        });
        await this.auditService.log({
            action: 'RESERVE_SALES_STOCK',
            entityName: 'SalesOrder',
            entityId: order.id,
            afterState: { status: 'RESERVED' },
            userEmail: user.email
        });
        return savedOrder;
    }
    async createDelivery(orderId, user) {
        const order = await this.findOrder(orderId);
        if (order.status !== entities_1.SalesOrderStatus.RESERVED) {
            throw new common_1.BadRequestException('Can only ship items for a RESERVED Sales Order');
        }
        const deliveryCount = await this.deliveryRepo.count();
        const code = `DLV-2026-${String(deliveryCount + 1).padStart(5, '0')}`;
        for (const item of order.items) {
            const whId = item.product.warehouse?.id;
            if (!whId) {
                throw new common_1.BadRequestException(`No warehouse assigned to product ${item.product.code}`);
            }
            await this.inventoryService.stockOut(item.product.id, whId, item.quantity, 'SALES_DELIVERY', order.id, user);
        }
        const delivery = this.deliveryRepo.create({
            code,
            salesOrder: order,
            shippedBy: user,
            status: entities_1.DeliveryStatus.DELIVERED,
            deliveryDate: new Date()
        });
        await this.deliveryRepo.save(delivery);
        order.status = entities_1.SalesOrderStatus.DELIVERED;
        await this.soRepo.save(order);
        await this.notificationsService.create({
            title: 'Sales Order Delivered',
            message: `Sales Order ${order.code} has been delivered successfully.`,
            recipientRole: 'Sales',
            entityType: 'SALES_ORDER',
            entityId: order.id
        });
        await this.auditService.log({
            action: 'DELIVER_SALES_ORDER',
            entityName: 'Delivery',
            entityId: delivery.id,
            afterState: { code, status: 'DELIVERED' },
            userEmail: user.email
        });
        return delivery;
    }
    async findDeliveries() {
        return this.deliveryRepo.find({
            relations: { salesOrder: { customer: true }, shippedBy: true },
            order: { code: 'DESC' }
        });
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.SalesOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.SalesOrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Delivery)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Customer)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.Stock)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        inventory_service_1.InventoryService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], SalesService);
//# sourceMappingURL=sales.service.js.map