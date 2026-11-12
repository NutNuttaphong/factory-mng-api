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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delivery = exports.DeliveryStatus = exports.SalesOrderItem = exports.SalesOrder = exports.SalesOrderStatus = void 0;
const typeorm_1 = require("typeorm");
const rbac_entity_1 = require("./rbac.entity");
const master_entity_1 = require("./master.entity");
var SalesOrderStatus;
(function (SalesOrderStatus) {
    SalesOrderStatus["DRAFT"] = "DRAFT";
    SalesOrderStatus["PENDING"] = "PENDING";
    SalesOrderStatus["RESERVED"] = "RESERVED";
    SalesOrderStatus["SHIPPED"] = "SHIPPED";
    SalesOrderStatus["DELIVERED"] = "DELIVERED";
    SalesOrderStatus["CANCELLED"] = "CANCELLED";
})(SalesOrderStatus || (exports.SalesOrderStatus = SalesOrderStatus = {}));
let SalesOrder = class SalesOrder {
    id;
    code;
    customer;
    salesperson;
    status;
    totalAmount;
    items;
    notes;
    createdAt;
    updatedAt;
};
exports.SalesOrder = SalesOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SalesOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], SalesOrder.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Customer, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", master_entity_1.Customer)
], SalesOrder.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'salesperson_id' }),
    __metadata("design:type", rbac_entity_1.User)
], SalesOrder.prototype, "salesperson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: SalesOrderStatus.DRAFT }),
    __metadata("design:type", String)
], SalesOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalesOrder.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SalesOrderItem, (item) => item.salesOrder, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], SalesOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SalesOrder.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SalesOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SalesOrder.prototype, "updatedAt", void 0);
exports.SalesOrder = SalesOrder = __decorate([
    (0, typeorm_1.Entity)('sales_orders')
], SalesOrder);
let SalesOrderItem = class SalesOrderItem {
    id;
    salesOrder;
    product;
    quantity;
    quantityReserved;
    price;
    totalPrice;
};
exports.SalesOrderItem = SalesOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SalesOrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SalesOrder, (so) => so.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sales_order_id' }),
    __metadata("design:type", SalesOrder)
], SalesOrderItem.prototype, "salesOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], SalesOrderItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], SalesOrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], SalesOrderItem.prototype, "quantityReserved", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], SalesOrderItem.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], SalesOrderItem.prototype, "totalPrice", void 0);
exports.SalesOrderItem = SalesOrderItem = __decorate([
    (0, typeorm_1.Entity)('sales_order_items')
], SalesOrderItem);
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "PENDING";
    DeliveryStatus["SHIPPED"] = "SHIPPED";
    DeliveryStatus["DELIVERED"] = "DELIVERED";
    DeliveryStatus["RETURNED"] = "RETURNED";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
let Delivery = class Delivery {
    id;
    code;
    salesOrder;
    shippedBy;
    status;
    deliveryDate;
    createdAt;
};
exports.Delivery = Delivery;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Delivery.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Delivery.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SalesOrder, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'sales_order_id' }),
    __metadata("design:type", SalesOrder)
], Delivery.prototype, "salesOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'shipped_by_id' }),
    __metadata("design:type", rbac_entity_1.User)
], Delivery.prototype, "shippedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: DeliveryStatus.PENDING }),
    __metadata("design:type", String)
], Delivery.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Delivery.prototype, "deliveryDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Delivery.prototype, "createdAt", void 0);
exports.Delivery = Delivery = __decorate([
    (0, typeorm_1.Entity)('deliveries')
], Delivery);
//# sourceMappingURL=sales.entity.js.map