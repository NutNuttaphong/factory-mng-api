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
exports.QualityDefect = exports.QualityInspection = exports.QAStatus = void 0;
const typeorm_1 = require("typeorm");
const rbac_entity_1 = require("./rbac.entity");
const master_entity_1 = require("./master.entity");
const production_entity_1 = require("./production.entity");
const purchasing_inventory_entity_1 = require("./purchasing-inventory.entity");
var QAStatus;
(function (QAStatus) {
    QAStatus["PASS"] = "PASS";
    QAStatus["FAIL"] = "FAIL";
    QAStatus["REWORK"] = "REWORK";
})(QAStatus || (exports.QAStatus = QAStatus = {}));
let QualityInspection = class QualityInspection {
    id;
    code;
    product;
    workOrder;
    goodsReceipt;
    batchNo;
    inspector;
    weight;
    size;
    color;
    temperature;
    defectDetails;
    status;
    comment;
    createdAt;
    updatedAt;
};
exports.QualityInspection = QualityInspection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QualityInspection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], QualityInspection.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => master_entity_1.Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", master_entity_1.Product)
], QualityInspection.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => production_entity_1.WorkOrder, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'work_order_id' }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "workOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchasing_inventory_entity_1.GoodsReceipt, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'goods_receipt_id' }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "goodsReceipt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QualityInspection.prototype, "batchNo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => rbac_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'inspector_id' }),
    __metadata("design:type", rbac_entity_1.User)
], QualityInspection.prototype, "inspector", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 1, nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "temperature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "defectDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: QAStatus.PASS }),
    __metadata("design:type", String)
], QualityInspection.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], QualityInspection.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QualityInspection.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], QualityInspection.prototype, "updatedAt", void 0);
exports.QualityInspection = QualityInspection = __decorate([
    (0, typeorm_1.Entity)('quality_inspections')
], QualityInspection);
let QualityDefect = class QualityDefect {
    id;
    inspection;
    defectType;
    severity;
    description;
    createdAt;
};
exports.QualityDefect = QualityDefect;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QualityDefect.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => QualityInspection, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'inspection_id' }),
    __metadata("design:type", QualityInspection)
], QualityDefect.prototype, "inspection", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QualityDefect.prototype, "defectType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 1 }),
    __metadata("design:type", Number)
], QualityDefect.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QualityDefect.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QualityDefect.prototype, "createdAt", void 0);
exports.QualityDefect = QualityDefect = __decorate([
    (0, typeorm_1.Entity)('quality_defects')
], QualityDefect);
//# sourceMappingURL=quality.entity.js.map