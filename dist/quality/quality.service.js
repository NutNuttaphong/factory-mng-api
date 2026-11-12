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
exports.QualityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const quality_entity_1 = require("../database/entities/quality.entity");
const production_entity_1 = require("../database/entities/production.entity");
const purchasing_inventory_entity_1 = require("../database/entities/purchasing-inventory.entity");
const master_entity_1 = require("../database/entities/master.entity");
const inventory_service_1 = require("../inventory/inventory.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
let QualityService = class QualityService {
    qaRepo;
    defectRepo;
    woRepo;
    grRepo;
    productRepo;
    inventoryService;
    notificationsService;
    auditService;
    constructor(qaRepo, defectRepo, woRepo, grRepo, productRepo, inventoryService, notificationsService, auditService) {
        this.qaRepo = qaRepo;
        this.defectRepo = defectRepo;
        this.woRepo = woRepo;
        this.grRepo = grRepo;
        this.productRepo = productRepo;
        this.inventoryService = inventoryService;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async findInspections() {
        return this.qaRepo.find({
            relations: { product: true, workOrder: true, goodsReceipt: true, inspector: true },
            order: { createdAt: 'DESC' }
        });
    }
    async getDefects() {
        return this.defectRepo.find({
            relations: { inspection: { product: true } },
            order: { createdAt: 'DESC' }
        });
    }
    async createInspection(user, dto) {
        const product = await this.productRepo.findOneBy({ id: dto.productId });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const qaCount = await this.qaRepo.count();
        const code = `QA-2026-${String(qaCount + 1).padStart(5, '0')}`;
        let workOrder = null;
        if (dto.workOrderId) {
            workOrder = await this.woRepo.findOne({ where: { id: dto.workOrderId }, relations: { product: { warehouse: true } } });
            if (!workOrder)
                throw new common_1.NotFoundException('Work Order not found');
        }
        let goodsReceipt = null;
        if (dto.goodsReceiptId) {
            goodsReceipt = await this.grRepo.findOne({ where: { id: dto.goodsReceiptId }, relations: { items: true, purchaseOrder: true } });
            if (!goodsReceipt)
                throw new common_1.NotFoundException('Goods Receipt not found');
        }
        const inspection = this.qaRepo.create({
            code,
            product,
            workOrder,
            goodsReceipt,
            batchNo: dto.batchNo,
            inspector: user,
            weight: dto.weight ? Number(dto.weight) : null,
            size: dto.size ? Number(dto.size) : null,
            color: dto.color,
            temperature: dto.temperature ? Number(dto.temperature) : null,
            defectDetails: dto.defectDetails,
            status: dto.status,
            comment: dto.comment
        });
        const savedQa = await this.qaRepo.save(inspection);
        if (dto.defectsList && dto.defectsList.length > 0) {
            for (const d of dto.defectsList) {
                await this.defectRepo.save(this.defectRepo.create({
                    inspection: savedQa,
                    defectType: d.defectType,
                    severity: d.severity,
                    description: d.description
                }));
            }
        }
        if (goodsReceipt) {
            if (dto.status === quality_entity_1.QAStatus.PASS) {
                goodsReceipt.status = purchasing_inventory_entity_1.GoodsReceiptStatus.QA_PASSED;
                await this.grRepo.save(goodsReceipt);
                for (const item of goodsReceipt.items) {
                    item.quantityAccepted = item.quantityReceived;
                    item.quantityRejected = 0;
                    const targetWhId = product.warehouse?.id;
                    if (targetWhId) {
                        await this.inventoryService.stockIn(item.product.id, targetWhId, item.quantityReceived, 'GOODS_RECEIPT_QA_PASS', goodsReceipt.id, user);
                    }
                }
                await this.grRepo.save(goodsReceipt);
            }
            else {
                goodsReceipt.status = purchasing_inventory_entity_1.GoodsReceiptStatus.QA_FAILED;
                for (const item of goodsReceipt.items) {
                    item.quantityAccepted = 0;
                    item.quantityRejected = item.quantityReceived;
                }
                await this.grRepo.save(goodsReceipt);
                await this.notificationsService.create({
                    title: 'QA Inspection Failed',
                    message: `Goods Receipt ${goodsReceipt.code} (PO: ${goodsReceipt.purchaseOrder?.code}) failed QA. Returned to supplier.`,
                    recipientRole: 'Warehouse',
                    entityType: 'QUALITY_INSPECTION',
                    entityId: savedQa.id
                });
            }
        }
        else if (workOrder) {
            if (dto.status === quality_entity_1.QAStatus.PASS) {
                workOrder.status = production_entity_1.WorkOrderStatus.COMPLETED;
                await this.woRepo.save(workOrder);
                const targetWhId = workOrder.product.warehouse?.id;
                if (targetWhId) {
                    await this.inventoryService.stockIn(workOrder.product.id, targetWhId, workOrder.quantity, 'WORK_ORDER_QA_PASS', workOrder.id, user);
                }
            }
            else {
                workOrder.status = production_entity_1.WorkOrderStatus.COMPLETED;
                await this.woRepo.save(workOrder);
                await this.notificationsService.create({
                    title: 'Production QA Defect Alert',
                    message: `Work Order ${workOrder.code} (${workOrder.product.name}) failed quality checks. Status: ${dto.status}.`,
                    recipientRole: 'Production',
                    entityType: 'QUALITY_INSPECTION',
                    entityId: savedQa.id
                });
            }
        }
        await this.auditService.log({
            action: 'QA_INSPECTION',
            entityName: 'QualityInspection',
            entityId: savedQa.id,
            afterState: { status: dto.status, code },
            userEmail: user.email
        });
        return savedQa;
    }
};
exports.QualityService = QualityService;
exports.QualityService = QualityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quality_entity_1.QualityInspection)),
    __param(1, (0, typeorm_1.InjectRepository)(quality_entity_1.QualityDefect)),
    __param(2, (0, typeorm_1.InjectRepository)(production_entity_1.WorkOrder)),
    __param(3, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.GoodsReceipt)),
    __param(4, (0, typeorm_1.InjectRepository)(master_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        inventory_service_1.InventoryService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], QualityService);
//# sourceMappingURL=quality.service.js.map