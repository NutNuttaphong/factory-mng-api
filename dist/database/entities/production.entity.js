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
exports.ProductionResult = exports.MaterialIssue = exports.WorkOrder = exports.ProductionPlan = exports.WorkOrderStatus = void 0;
const typeorm_1 = require("typeorm");
const rbac_entity_1 = require("./rbac.entity");
const master_entity_1 = require("./master.entity");
var WorkOrderStatus;
(function (WorkOrderStatus) {
    WorkOrderStatus["DRAFT"] = "DRAFT";
    WorkOrderStatus["PENDING_MATERIAL"] = "PENDING_MATERIAL";
    WorkOrderStatus["MATERIAL_ISSUED"] = "MATERIAL_ISSUED";
    WorkOrderStatus["IN_PRODUCTION"] = "IN_PRODUCTION";
    WorkOrderStatus["PENDING_QA"] = "PENDING_QA";
    WorkOrderStatus["COMPLETED"] = "COMPLETED";
    WorkOrderStatus["CANCELLED"] = "CANCELLED";
})(WorkOrderStatus || (exports.WorkOrderStatus = WorkOrderStatus = {}));
let ProductionPlan = class ProductionPlan {
    id;
    code;
    product;
    targetQuantity;
    startDate;
    endDate;
    status;
    workOrders;
    createdAt;
};
exports.ProductionPlan = ProductionPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProductionPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ProductionPlan.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], ProductionPlan.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], ProductionPlan.prototype, "targetQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], ProductionPlan.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], ProductionPlan.prototype, "endDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'PENDING' }),
    __metadata("design:type", String)
], ProductionPlan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkOrder, (wo) => wo.productionPlan),
    __metadata("design:type", Array)
], ProductionPlan.prototype, "workOrders", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProductionPlan.prototype, "createdAt", void 0);
exports.ProductionPlan = ProductionPlan = __decorate([
    (0, typeorm_1.Entity)('production_plans')
], ProductionPlan);
let WorkOrder = class WorkOrder {
    id;
    code;
    productionPlan;
    product;
    quantity;
    status;
    assignedTo;
    createdAt;
    updatedAt;
};
exports.WorkOrder = WorkOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WorkOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], WorkOrder.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ProductionPlan, (plan) => plan.workOrders, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'production_plan_id' }),
    __metadata("design:type", Object)
], WorkOrder.prototype, "productionPlan", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], WorkOrder.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], WorkOrder.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: WorkOrderStatus.DRAFT }),
    __metadata("design:type", String)
], WorkOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_to_id' }),
    __metadata("design:type", rbac_entity_1.User)
], WorkOrder.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WorkOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WorkOrder.prototype, "updatedAt", void 0);
exports.WorkOrder = WorkOrder = __decorate([
    (0, typeorm_1.Entity)('work_orders')
], WorkOrder);
let MaterialIssue = class MaterialIssue {
    id;
    code;
    workOrder;
    warehouse;
    issuedBy;
    items;
    createdAt;
};
exports.MaterialIssue = MaterialIssue;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MaterialIssue.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], MaterialIssue.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkOrder, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'work_order_id' }),
    __metadata("design:type", WorkOrder)
], MaterialIssue.prototype, "workOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Warehouse, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'warehouse_id' }),
    __metadata("design:type", master_entity_1.Warehouse)
], MaterialIssue.prototype, "warehouse", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'issued_by_id' }),
    __metadata("design:type", rbac_entity_1.User)
], MaterialIssue.prototype, "issuedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], MaterialIssue.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MaterialIssue.prototype, "createdAt", void 0);
exports.MaterialIssue = MaterialIssue = __decorate([
    (0, typeorm_1.Entity)('material_issues')
], MaterialIssue);
let ProductionResult = class ProductionResult {
    id;
    code;
    workOrder;
    quantityProduced;
    quantityDefective;
    operator;
    notes;
    createdAt;
};
exports.ProductionResult = ProductionResult;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ProductionResult.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], ProductionResult.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkOrder, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'work_order_id' }),
    __metadata("design:type", WorkOrder)
], ProductionResult.prototype, "workOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], ProductionResult.prototype, "quantityProduced", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], ProductionResult.prototype, "quantityDefective", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'operator_id' }),
    __metadata("design:type", rbac_entity_1.User)
], ProductionResult.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ProductionResult.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ProductionResult.prototype, "createdAt", void 0);
exports.ProductionResult = ProductionResult = __decorate([
    (0, typeorm_1.Entity)('production_results')
], ProductionResult);
//# sourceMappingURL=production.entity.js.map