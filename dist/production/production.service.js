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
exports.ProductionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const inventory_service_1 = require("../inventory/inventory.service");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
let ProductionService = class ProductionService {
    planRepo;
    woRepo;
    issueRepo;
    resultRepo;
    bomRepo;
    bomItemRepo;
    productRepo;
    warehouseRepo;
    stockRepo;
    userRepo;
    inventoryService;
    notificationsService;
    auditService;
    constructor(planRepo, woRepo, issueRepo, resultRepo, bomRepo, bomItemRepo, productRepo, warehouseRepo, stockRepo, userRepo, inventoryService, notificationsService, auditService) {
        this.planRepo = planRepo;
        this.woRepo = woRepo;
        this.issueRepo = issueRepo;
        this.resultRepo = resultRepo;
        this.bomRepo = bomRepo;
        this.bomItemRepo = bomItemRepo;
        this.productRepo = productRepo;
        this.warehouseRepo = warehouseRepo;
        this.stockRepo = stockRepo;
        this.userRepo = userRepo;
        this.inventoryService = inventoryService;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async findBOMs() {
        return this.bomRepo.find({
            relations: { product: true, items: { product: true } },
            order: { code: 'ASC' }
        });
    }
    async createBOM(dto) {
        const product = await this.productRepo.findOneBy({ id: dto.productId });
        if (!product)
            throw new common_1.NotFoundException('Finished product not found');
        const bom = this.bomRepo.create({
            code: dto.code,
            product,
            description: dto.description,
            isActive: true,
            items: []
        });
        const savedBom = await this.bomRepo.save(bom);
        const items = [];
        for (const itemDto of dto.items) {
            const comp = await this.productRepo.findOneBy({ id: itemDto.productId });
            if (!comp)
                throw new common_1.NotFoundException(`Component product ${itemDto.productId} not found`);
            const item = this.bomItemRepo.create({
                bom: savedBom,
                product: comp,
                quantityNeeded: itemDto.quantityNeeded
            });
            items.push(await this.bomItemRepo.save(item));
        }
        savedBom.items = items;
        return savedBom;
    }
    async findPlans() {
        return this.planRepo.find({
            relations: { product: true },
            order: { createdAt: 'DESC' }
        });
    }
    async createPlan(dto) {
        const product = await this.productRepo.findOneBy({ id: dto.productId });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const planCount = await this.planRepo.count();
        const code = `PLN-2026-${String(planCount + 1).padStart(5, '0')}`;
        const plan = this.planRepo.create({
            code,
            product,
            targetQuantity: dto.targetQuantity,
            startDate: dto.startDate,
            endDate: dto.endDate,
            status: 'PENDING'
        });
        return this.planRepo.save(plan);
    }
    async findWorkOrders() {
        return this.woRepo.find({
            relations: { productionPlan: true, product: true, assignedTo: true },
            order: { code: 'DESC' }
        });
    }
    async findWorkOrder(id) {
        let wo = await this.woRepo.findOne({
            where: { id },
            relations: { productionPlan: true, product: true, assignedTo: true }
        });
        if (!wo && id.startsWith('wo-')) {
            const idx = parseInt(id.substring(3), 10);
            if (!isNaN(idx)) {
                const code = `WO-2026-${String(idx).padStart(5, '0')}`;
                wo = await this.woRepo.findOne({
                    where: { code },
                    relations: { productionPlan: true, product: true, assignedTo: true }
                });
            }
        }
        if (!wo)
            throw new common_1.NotFoundException('Work Order not found');
        return wo;
    }
    async createWorkOrder(dto) {
        const product = await this.productRepo.findOneBy({ id: dto.productId });
        const assignedTo = await this.userRepo.findOne({
            where: [
                { id: dto.assignedToId },
                { email: dto.assignedToId }
            ]
        });
        if (!product || !assignedTo)
            throw new common_1.NotFoundException('Product or Operator not found');
        let plan = null;
        if (dto.productionPlanId) {
            plan = await this.planRepo.findOneBy({ id: dto.productionPlanId });
            if (plan) {
                plan.status = 'ACTIVE';
                await this.planRepo.save(plan);
            }
        }
        const woCount = await this.woRepo.count();
        const code = `WO-2026-${String(woCount + 1).padStart(5, '0')}`;
        const wo = this.woRepo.create({
            code,
            productionPlan: plan,
            product,
            quantity: dto.quantity,
            status: entities_1.WorkOrderStatus.DRAFT,
            assignedTo
        });
        return this.woRepo.save(wo);
    }
    async checkMaterialRequirement(woId) {
        const wo = await this.findWorkOrder(woId);
        const bom = await this.bomRepo.findOne({
            where: { product: { id: wo.product.id }, isActive: true },
            relations: { items: { product: true } }
        });
        if (!bom) {
            throw new common_1.BadRequestException(`No active Bill of Materials found for product ${wo.product.code}`);
        }
        const requirements = [];
        let allAvailable = true;
        for (const bomItem of bom.items) {
            const requiredQty = Number(bomItem.quantityNeeded) * wo.quantity;
            const stock = await this.stockRepo.findOne({
                where: { product: { id: bomItem.product.id } }
            });
            const currentQty = stock ? stock.quantity : 0;
            const isAvailable = currentQty >= requiredQty;
            if (!isAvailable)
                allAvailable = false;
            requirements.push({
                productId: bomItem.product.id,
                code: bomItem.product.code,
                name: bomItem.product.name,
                requiredQty,
                availableQty: currentQty,
                isAvailable
            });
        }
        return {
            workOrderId: wo.id,
            workOrderCode: wo.code,
            productCode: wo.product.code,
            productName: wo.product.name,
            targetQty: wo.quantity,
            allAvailable,
            requirements
        };
    }
    async issueMaterials(woId, warehouseId, user) {
        const wo = await this.findWorkOrder(woId);
        if (wo.status !== entities_1.WorkOrderStatus.DRAFT && wo.status !== entities_1.WorkOrderStatus.PENDING_MATERIAL) {
            throw new common_1.BadRequestException('Materials can only be issued for DRAFT or PENDING_MATERIAL orders');
        }
        const check = await this.checkMaterialRequirement(woId);
        if (!check.allAvailable) {
            wo.status = entities_1.WorkOrderStatus.PENDING_MATERIAL;
            await this.woRepo.save(wo);
            throw new common_1.BadRequestException('Cannot issue materials, stock is insufficient for some components');
        }
        const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });
        if (!warehouse)
            throw new common_1.NotFoundException('Warehouse not found');
        const issueItems = [];
        for (const req of check.requirements) {
            await this.inventoryService.stockOut(req.productId, warehouse.id, req.requiredQty, 'WORK_ORDER_ISSUE', wo.id, user);
            issueItems.push({
                productId: req.productId,
                productCode: req.code,
                productName: req.name,
                quantityRequired: req.requiredQty,
                quantityIssued: req.requiredQty
            });
        }
        const issueCount = await this.issueRepo.count();
        const code = `MI-2026-${String(issueCount + 1).padStart(5, '0')}`;
        const materialIssue = this.issueRepo.create({
            code,
            workOrder: wo,
            warehouse,
            issuedBy: user,
            items: issueItems
        });
        await this.issueRepo.save(materialIssue);
        wo.status = entities_1.WorkOrderStatus.MATERIAL_ISSUED;
        await this.woRepo.save(wo);
        await this.notificationsService.create({
            title: 'Materials Issued',
            message: `Materials for Work Order ${wo.code} have been successfully issued from ${warehouse.name}.`,
            recipientRole: 'Production',
            entityType: 'WORK_ORDER',
            entityId: wo.id
        });
        return materialIssue;
    }
    async startProduction(woId) {
        const wo = await this.findWorkOrder(woId);
        if (wo.status !== entities_1.WorkOrderStatus.MATERIAL_ISSUED) {
            throw new common_1.BadRequestException('Cannot start production. Materials must be ISSUED first.');
        }
        wo.status = entities_1.WorkOrderStatus.IN_PRODUCTION;
        return this.woRepo.save(wo);
    }
    async reportResult(woId, qtyProduced, qtyDefective, notes, user) {
        const wo = await this.findWorkOrder(woId);
        if (wo.status !== entities_1.WorkOrderStatus.IN_PRODUCTION) {
            throw new common_1.BadRequestException('Can only report results for orders currently IN_PRODUCTION');
        }
        const resultCount = await this.resultRepo.count();
        const code = `PRR-2026-${String(resultCount + 1).padStart(5, '0')}`;
        const result = this.resultRepo.create({
            code,
            workOrder: wo,
            quantityProduced: Number(qtyProduced),
            quantityDefective: Number(qtyDefective),
            operator: user,
            notes
        });
        await this.resultRepo.save(result);
        wo.status = entities_1.WorkOrderStatus.PENDING_QA;
        await this.woRepo.save(wo);
        await this.notificationsService.create({
            title: 'Production QA Inspection Required',
            message: `Work Order ${wo.code} completed production of ${qtyProduced} units. QA inspection required.`,
            recipientRole: 'QA',
            entityType: 'WORK_ORDER',
            entityId: wo.id
        });
        await this.auditService.log({
            action: 'PRODUCTION_REPORT',
            entityName: 'WorkOrder',
            entityId: wo.id,
            afterState: { qtyProduced, qtyDefective },
            userEmail: user.email
        });
        return result;
    }
};
exports.ProductionService = ProductionService;
exports.ProductionService = ProductionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.ProductionPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.WorkOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.MaterialIssue)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.ProductionResult)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.BOM)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.BOMItem)),
    __param(6, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(7, (0, typeorm_1.InjectRepository)(entities_1.Warehouse)),
    __param(8, (0, typeorm_1.InjectRepository)(entities_1.Stock)),
    __param(9, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        inventory_service_1.InventoryService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], ProductionService);
//# sourceMappingURL=production.service.js.map