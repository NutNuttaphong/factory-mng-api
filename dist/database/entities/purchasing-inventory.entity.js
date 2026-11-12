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
exports.BOMItem = exports.BOM = exports.StockMovement = exports.StockMovementType = exports.Stock = exports.GoodsReceiptItem = exports.GoodsReceipt = exports.GoodsReceiptStatus = exports.PurchaseOrderItem = exports.PurchaseOrder = exports.PurchaseRequestItem = exports.PurchaseRequest = exports.ApprovalStatus = void 0;
const typeorm_1 = require("typeorm");
const rbac_entity_1 = require("./rbac.entity");
const master_entity_1 = require("./master.entity");
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["DRAFT"] = "DRAFT";
    ApprovalStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
    ApprovalStatus["CANCELLED"] = "CANCELLED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
let PurchaseRequest = class PurchaseRequest {
    id;
    code;
    requester;
    status;
    totalAmount;
    items;
    comment;
    createdAt;
    updatedAt;
};
exports.PurchaseRequest = PurchaseRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PurchaseRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PurchaseRequest.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'requester_id' }),
    __metadata("design:type", rbac_entity_1.User)
], PurchaseRequest.prototype, "requester", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: ApprovalStatus.DRAFT }),
    __metadata("design:type", String)
], PurchaseRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseRequest.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PurchaseRequestItem, (item) => item.purchaseRequest, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], PurchaseRequest.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseRequest.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseRequest.prototype, "updatedAt", void 0);
exports.PurchaseRequest = PurchaseRequest = __decorate([
    (0, typeorm_1.Entity)('purchase_requests')
], PurchaseRequest);
let PurchaseRequestItem = class PurchaseRequestItem {
    id;
    purchaseRequest;
    product;
    quantity;
    estimatedPrice;
    totalPrice;
};
exports.PurchaseRequestItem = PurchaseRequestItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PurchaseRequestItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PurchaseRequest, (pr) => pr.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_request_id' }),
    __metadata("design:type", PurchaseRequest)
], PurchaseRequestItem.prototype, "purchaseRequest", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], PurchaseRequestItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], PurchaseRequestItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseRequestItem.prototype, "estimatedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseRequestItem.prototype, "totalPrice", void 0);
exports.PurchaseRequestItem = PurchaseRequestItem = __decorate([
    (0, typeorm_1.Entity)('purchase_request_items')
], PurchaseRequestItem);
let PurchaseOrder = class PurchaseOrder {
    id;
    code;
    supplier;
    buyer;
    status;
    totalAmount;
    items;
    purchaseRequest;
    comment;
    createdAt;
    updatedAt;
};
exports.PurchaseOrder = PurchaseOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Supplier, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", master_entity_1.Supplier)
], PurchaseOrder.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_id' }),
    __metadata("design:type", rbac_entity_1.User)
], PurchaseOrder.prototype, "buyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: ApprovalStatus.DRAFT }),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrder.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], PurchaseOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PurchaseRequest, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_request_id' }),
    __metadata("design:type", PurchaseRequest)
], PurchaseOrder.prototype, "purchaseRequest", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PurchaseOrder.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], PurchaseOrder.prototype, "updatedAt", void 0);
exports.PurchaseOrder = PurchaseOrder = __decorate([
    (0, typeorm_1.Entity)('purchase_orders')
], PurchaseOrder);
let PurchaseOrderItem = class PurchaseOrderItem {
    id;
    purchaseOrder;
    product;
    quantity;
    price;
    totalPrice;
};
exports.PurchaseOrderItem = PurchaseOrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PurchaseOrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", PurchaseOrder)
], PurchaseOrderItem.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], PurchaseOrderItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], PurchaseOrderItem.prototype, "totalPrice", void 0);
exports.PurchaseOrderItem = PurchaseOrderItem = __decorate([
    (0, typeorm_1.Entity)('purchase_order_items')
], PurchaseOrderItem);
var GoodsReceiptStatus;
(function (GoodsReceiptStatus) {
    GoodsReceiptStatus["PENDING_QA"] = "PENDING_QA";
    GoodsReceiptStatus["QA_PASSED"] = "QA_PASSED";
    GoodsReceiptStatus["QA_FAILED"] = "QA_FAILED";
    GoodsReceiptStatus["STOCKED"] = "STOCKED";
})(GoodsReceiptStatus || (exports.GoodsReceiptStatus = GoodsReceiptStatus = {}));
let GoodsReceipt = class GoodsReceipt {
    id;
    code;
    purchaseOrder;
    receivedBy;
    status;
    items;
    createdAt;
};
exports.GoodsReceipt = GoodsReceipt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GoodsReceipt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], GoodsReceipt.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PurchaseOrder, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", PurchaseOrder)
], GoodsReceipt.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'received_by_id' }),
    __metadata("design:type", rbac_entity_1.User)
], GoodsReceipt.prototype, "receivedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: GoodsReceiptStatus.PENDING_QA }),
    __metadata("design:type", String)
], GoodsReceipt.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GoodsReceiptItem, (item) => item.goodsReceipt, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], GoodsReceipt.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], GoodsReceipt.prototype, "createdAt", void 0);
exports.GoodsReceipt = GoodsReceipt = __decorate([
    (0, typeorm_1.Entity)('goods_receipts')
], GoodsReceipt);
let GoodsReceiptItem = class GoodsReceiptItem {
    id;
    goodsReceipt;
    product;
    quantityReceived;
    quantityAccepted;
    quantityRejected;
};
exports.GoodsReceiptItem = GoodsReceiptItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GoodsReceiptItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => GoodsReceipt, (gr) => gr.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'goods_receipt_id' }),
    __metadata("design:type", GoodsReceipt)
], GoodsReceiptItem.prototype, "goodsReceipt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], GoodsReceiptItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "quantityReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "quantityAccepted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "quantityRejected", void 0);
exports.GoodsReceiptItem = GoodsReceiptItem = __decorate([
    (0, typeorm_1.Entity)('goods_receipt_items')
], GoodsReceiptItem);
let Stock = class Stock {
    id;
    product;
    warehouse;
    quantity;
    status;
    updatedAt;
};
exports.Stock = Stock;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Stock.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], Stock.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Warehouse, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'warehouse_id' }),
    __metadata("design:type", master_entity_1.Warehouse)
], Stock.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Stock.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'NORMAL' }),
    __metadata("design:type", String)
], Stock.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Stock.prototype, "updatedAt", void 0);
exports.Stock = Stock = __decorate([
    (0, typeorm_1.Entity)('stocks')
], Stock);
var StockMovementType;
(function (StockMovementType) {
    StockMovementType["STOCK_IN"] = "STOCK_IN";
    StockMovementType["STOCK_OUT"] = "STOCK_OUT";
    StockMovementType["TRANSFER"] = "TRANSFER";
    StockMovementType["ADJUSTMENT"] = "ADJUSTMENT";
    StockMovementType["RETURN"] = "RETURN";
})(StockMovementType || (exports.StockMovementType = StockMovementType = {}));
let StockMovement = class StockMovement {
    id;
    type;
    product;
    fromWarehouse;
    toWarehouse;
    quantity;
    referenceType;
    referenceId;
    user;
    createdAt;
};
exports.StockMovement = StockMovement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StockMovement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], StockMovement.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], StockMovement.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Warehouse, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'from_warehouse_id' }),
    __metadata("design:type", Object)
], StockMovement.prototype, "fromWarehouse", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Warehouse, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'to_warehouse_id' }),
    __metadata("design:type", Object)
], StockMovement.prototype, "toWarehouse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockMovement.prototype, "referenceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StockMovement.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", rbac_entity_1.User)
], StockMovement.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StockMovement.prototype, "createdAt", void 0);
exports.StockMovement = StockMovement = __decorate([
    (0, typeorm_1.Entity)('stock_movements')
], StockMovement);
let BOM = class BOM {
    id;
    code;
    product;
    description;
    items;
    isActive;
    createdAt;
};
exports.BOM = BOM;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BOM.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], BOM.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], BOM.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BOM.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => BOMItem, (item) => item.bom, { cascade: true, eager: true }),
    __metadata("design:type", Array)
], BOM.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], BOM.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BOM.prototype, "createdAt", void 0);
exports.BOM = BOM = __decorate([
    (0, typeorm_1.Entity)('boms')
], BOM);
let BOMItem = class BOMItem {
    id;
    bom;
    product;
    quantityNeeded;
};
exports.BOMItem = BOMItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BOMItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => BOM, (bom) => bom.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'bom_id' }),
    __metadata("design:type", BOM)
], BOMItem.prototype, "bom", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], BOMItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], BOMItem.prototype, "quantityNeeded", void 0);
exports.BOMItem = BOMItem = __decorate([
    (0, typeorm_1.Entity)('bom_items')
], BOMItem);
//# sourceMappingURL=purchasing-inventory.entity.js.map