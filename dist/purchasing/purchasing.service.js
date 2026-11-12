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
exports.PurchasingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
const notifications_service_1 = require("../notifications/notifications.service");
const audit_service_1 = require("../audit/audit.service");
let PurchasingService = class PurchasingService {
    prRepo;
    prItemRepo;
    poRepo;
    poItemRepo;
    grRepo;
    grItemRepo;
    workflowRepo;
    stepRepo;
    historyRepo;
    productRepo;
    supplierRepo;
    userRepo;
    notificationsService;
    auditService;
    constructor(prRepo, prItemRepo, poRepo, poItemRepo, grRepo, grItemRepo, workflowRepo, stepRepo, historyRepo, productRepo, supplierRepo, userRepo, notificationsService, auditService) {
        this.prRepo = prRepo;
        this.prItemRepo = prItemRepo;
        this.poRepo = poRepo;
        this.poItemRepo = poItemRepo;
        this.grRepo = grRepo;
        this.grItemRepo = grItemRepo;
        this.workflowRepo = workflowRepo;
        this.stepRepo = stepRepo;
        this.historyRepo = historyRepo;
        this.productRepo = productRepo;
        this.supplierRepo = supplierRepo;
        this.userRepo = userRepo;
        this.notificationsService = notificationsService;
        this.auditService = auditService;
    }
    async findPRs() {
        return this.prRepo.find({
            relations: { requester: true, items: { product: true } },
            order: { code: 'DESC' }
        });
    }
    async findPR(id) {
        let pr = await this.prRepo.findOne({
            where: { id },
            relations: { requester: true, items: { product: true } }
        });
        if (!pr && id.startsWith('pr-')) {
            const idx = parseInt(id.substring(3), 10);
            if (!isNaN(idx)) {
                const code = `PR-2026-${String(idx).padStart(5, '0')}`;
                pr = await this.prRepo.findOne({
                    where: { code },
                    relations: { requester: true, items: { product: true } }
                });
            }
        }
        if (!pr)
            throw new common_1.NotFoundException('Purchase Request not found');
        return pr;
    }
    async createPR(user, itemsDto) {
        const prCount = await this.prRepo.count();
        const code = `PR-2026-${String(prCount + 1).padStart(5, '0')}`;
        let totalAmount = 0;
        const items = [];
        for (const itemDto of itemsDto) {
            const product = await this.productRepo.findOneBy({ id: itemDto.productId });
            if (!product)
                throw new common_1.NotFoundException(`Product ${itemDto.productId} not found`);
            const totalPrice = itemDto.quantity * itemDto.estimatedPrice;
            totalAmount += totalPrice;
            const item = this.prItemRepo.create({
                product,
                quantity: itemDto.quantity,
                estimatedPrice: itemDto.estimatedPrice,
                totalPrice
            });
            items.push(item);
        }
        const pr = this.prRepo.create({
            code,
            requester: user,
            status: entities_1.ApprovalStatus.DRAFT,
            totalAmount,
            items
        });
        const savedPr = await this.prRepo.save(pr);
        await this.logApprovalHistory('PURCHASE_REQUEST', savedPr.id, user, 'CREATE', 'Created draft Purchase Request', null, entities_1.ApprovalStatus.DRAFT);
        return savedPr;
    }
    async submitPR(id, user) {
        const pr = await this.findPR(id);
        if (pr.status !== entities_1.ApprovalStatus.DRAFT) {
            throw new common_1.BadRequestException('Only DRAFT purchase requests can be submitted');
        }
        const workflow = await this.workflowRepo.findOne({
            where: { targetType: 'PURCHASE_REQUEST', isActive: true },
        });
        const workflows = await this.workflowRepo.find({
            where: { targetType: 'PURCHASE_REQUEST', isActive: true }
        });
        const matchingWorkflow = workflows.find((w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount));
        if (!matchingWorkflow) {
            pr.status = entities_1.ApprovalStatus.APPROVED;
            await this.prRepo.save(pr);
            await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'AUTO_APPROVE', 'Auto-approved, no matching threshold workflow', entities_1.ApprovalStatus.DRAFT, entities_1.ApprovalStatus.APPROVED);
            await this.generatePOFromPR(pr, user);
            return pr;
        }
        pr.status = entities_1.ApprovalStatus.PENDING_APPROVAL;
        const savedPr = await this.prRepo.save(pr);
        const firstStep = await this.stepRepo.findOne({
            where: { workflow: { id: matchingWorkflow.id }, stepOrder: 1 },
            relations: { role: true }
        });
        await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'SUBMIT', 'Submitted for approval', entities_1.ApprovalStatus.DRAFT, entities_1.ApprovalStatus.PENDING_APPROVAL);
        if (firstStep) {
            await this.notificationsService.create({
                title: 'PR Pending Approval',
                message: `Purchase Request ${pr.code} (Total: ${pr.totalAmount} THB) is waiting for approval`,
                recipientRole: firstStep.role.name,
                entityType: 'PURCHASE_REQUEST',
                entityId: pr.id
            });
        }
        return savedPr;
    }
    async approvePR(id, comment, user) {
        const pr = await this.findPR(id);
        if (pr.status !== entities_1.ApprovalStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException('Request is not pending approval');
        }
        const workflows = await this.workflowRepo.find({ where: { targetType: 'PURCHASE_REQUEST', isActive: true } });
        const matchingWorkflow = workflows.find((w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount));
        if (!matchingWorkflow) {
            pr.status = entities_1.ApprovalStatus.APPROVED;
            await this.prRepo.save(pr);
            await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'APPROVE', comment, entities_1.ApprovalStatus.PENDING_APPROVAL, entities_1.ApprovalStatus.APPROVED);
            await this.generatePOFromPR(pr, user);
            return pr;
        }
        const history = await this.historyRepo.find({
            where: { entityType: 'PURCHASE_REQUEST', entityId: pr.id, action: 'APPROVE' },
            order: { createdAt: 'ASC' }
        });
        const steps = await this.stepRepo.find({
            where: { workflow: { id: matchingWorkflow.id } },
            relations: { role: true },
            order: { stepOrder: 'ASC' }
        });
        const nextStepIndex = history.length;
        if (nextStepIndex >= steps.length) {
            pr.status = entities_1.ApprovalStatus.APPROVED;
            await this.prRepo.save(pr);
            await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'APPROVE', comment, entities_1.ApprovalStatus.PENDING_APPROVAL, entities_1.ApprovalStatus.APPROVED);
            await this.generatePOFromPR(pr, user);
            return pr;
        }
        const currentStepToApprove = steps[nextStepIndex];
        const userHasRole = user.roles.some((r) => r.id === currentStepToApprove.role.id || r.name === 'Super Admin');
        if (!userHasRole) {
            throw new common_1.BadRequestException(`Approver must have the role: ${currentStepToApprove.role.name}`);
        }
        await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'APPROVE', `Step ${currentStepToApprove.stepOrder} Approved: ${comment}`, entities_1.ApprovalStatus.PENDING_APPROVAL, nextStepIndex === steps.length - 1 ? entities_1.ApprovalStatus.APPROVED : entities_1.ApprovalStatus.PENDING_APPROVAL);
        if (nextStepIndex === steps.length - 1) {
            pr.status = entities_1.ApprovalStatus.APPROVED;
            await this.prRepo.save(pr);
            await this.notificationsService.create({
                title: 'PR Approved',
                message: `Your Purchase Request ${pr.code} has been approved.`,
                recipientId: pr.requester.id,
                entityType: 'PURCHASE_REQUEST',
                entityId: pr.id
            });
            await this.generatePOFromPR(pr, user);
        }
        else {
            const nextStep = steps[nextStepIndex + 1];
            await this.notificationsService.create({
                title: 'PR Pending Approval (Next Step)',
                message: `Purchase Request ${pr.code} (Total: ${pr.totalAmount} THB) is waiting for step ${nextStep.stepOrder} approval.`,
                recipientRole: nextStep.role.name,
                entityType: 'PURCHASE_REQUEST',
                entityId: pr.id
            });
        }
        return pr;
    }
    async rejectPR(id, comment, user) {
        const pr = await this.findPR(id);
        if (pr.status !== entities_1.ApprovalStatus.PENDING_APPROVAL) {
            throw new common_1.BadRequestException('Request is not pending approval');
        }
        pr.status = entities_1.ApprovalStatus.REJECTED;
        await this.prRepo.save(pr);
        await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'REJECT', comment, entities_1.ApprovalStatus.PENDING_APPROVAL, entities_1.ApprovalStatus.REJECTED);
        await this.notificationsService.create({
            title: 'PR Rejected',
            message: `Your Purchase Request ${pr.code} was rejected. Reason: ${comment}`,
            recipientId: pr.requester.id,
            entityType: 'PURCHASE_REQUEST',
            entityId: pr.id
        });
        return pr;
    }
    async findPOs() {
        return this.poRepo.find({
            relations: { supplier: true, buyer: true, items: { product: true } },
            order: { code: 'DESC' }
        });
    }
    async findPO(id) {
        let po = await this.poRepo.findOne({
            where: { id },
            relations: { supplier: true, buyer: true, items: { product: true } }
        });
        if (!po && id.startsWith('po-')) {
            const idx = parseInt(id.substring(3), 10);
            if (!isNaN(idx)) {
                const code = `PO-2026-${String(idx).padStart(5, '0')}`;
                po = await this.poRepo.findOne({
                    where: { code },
                    relations: { supplier: true, buyer: true, items: { product: true } }
                });
            }
        }
        if (!po)
            throw new common_1.NotFoundException('Purchase Order not found');
        return po;
    }
    async generatePOFromPR(pr, user) {
        const poCount = await this.poRepo.count();
        const code = `PO-2026-${String(poCount + 1).padStart(5, '0')}`;
        const supplier = await this.supplierRepo.findOne({ order: { name: 'ASC' } });
        if (!supplier)
            return;
        const poItems = [];
        pr.items.forEach((prItem) => {
            const poItem = this.poItemRepo.create({
                product: prItem.product,
                quantity: prItem.quantity,
                price: prItem.estimatedPrice,
                totalPrice: prItem.totalPrice
            });
            poItems.push(poItem);
        });
        const po = this.poRepo.create({
            code,
            supplier,
            buyer: user,
            status: entities_1.ApprovalStatus.APPROVED,
            totalAmount: pr.totalAmount,
            items: poItems,
            purchaseRequest: pr
        });
        await this.poRepo.save(po);
        await this.notificationsService.create({
            title: 'New PO Generated',
            message: `Purchase Order ${code} has been generated from PR ${pr.code}`,
            recipientRole: 'Purchasing',
            entityType: 'PURCHASE_ORDER',
            entityId: po.id
        });
    }
    async findGRs() {
        return this.grRepo.find({
            relations: { purchaseOrder: { supplier: true }, receivedBy: true, items: { product: true } },
            order: { code: 'DESC' }
        });
    }
    async findGR(id) {
        const gr = await this.grRepo.findOne({
            where: { id },
            relations: { purchaseOrder: { supplier: true }, receivedBy: true, items: { product: true } }
        });
        if (!gr)
            throw new common_1.NotFoundException('Goods Receipt not found');
        return gr;
    }
    async createGR(poId, receivedById, itemsDto) {
        const po = await this.findPO(poId);
        const receivedBy = await this.userRepo.findOneBy({ id: receivedById });
        if (!receivedBy)
            throw new common_1.NotFoundException('Receiving user not found');
        if (po.status !== entities_1.ApprovalStatus.APPROVED) {
            throw new common_1.BadRequestException('Can only receive goods for an APPROVED Purchase Order');
        }
        const grCount = await this.grRepo.count();
        const code = `GR-2026-${String(grCount + 1).padStart(5, '0')}`;
        const items = [];
        for (const itemDto of itemsDto) {
            const product = await this.productRepo.findOneBy({ id: itemDto.productId });
            if (!product)
                throw new common_1.NotFoundException(`Product ${itemDto.productId} not found`);
            const item = this.grItemRepo.create({
                product,
                quantityReceived: itemDto.quantityReceived,
                quantityAccepted: 0,
                quantityRejected: 0
            });
            items.push(item);
        }
        const gr = this.grRepo.create({
            code,
            purchaseOrder: po,
            receivedBy,
            status: entities_1.GoodsReceiptStatus.PENDING_QA,
            items
        });
        const savedGr = await this.grRepo.save(gr);
        await this.notificationsService.create({
            title: 'Goods QA Inspection Required',
            message: `Goods Receipt ${code} (PO: ${po.code}) requires quality inspection.`,
            recipientRole: 'QA',
            entityType: 'GOODS_RECEIPT',
            entityId: savedGr.id
        });
        await this.auditService.log({
            action: 'CREATE_GOODS_RECEIPT',
            entityName: 'GoodsReceipt',
            entityId: savedGr.id,
            afterState: { code, poCode: po.code },
            userEmail: receivedBy.email
        });
        return savedGr;
    }
    async logApprovalHistory(entityType, entityId, user, action, comment, previousStatus, newStatus) {
        const history = this.historyRepo.create({
            entityType,
            entityId,
            user,
            action,
            comment,
            previousStatus: previousStatus ?? undefined,
            newStatus: newStatus ?? undefined
        });
        await this.historyRepo.save(history);
    }
    async getApprovalHistory(entityType, entityId) {
        return this.historyRepo.find({
            where: { entityType, entityId },
            relations: { user: true },
            order: { createdAt: 'ASC' }
        });
    }
};
exports.PurchasingService = PurchasingService;
exports.PurchasingService = PurchasingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.PurchaseRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.PurchaseRequestItem)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.PurchaseOrder)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.PurchaseOrderItem)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.GoodsReceipt)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.GoodsReceiptItem)),
    __param(6, (0, typeorm_1.InjectRepository)(entities_1.ApprovalWorkflow)),
    __param(7, (0, typeorm_1.InjectRepository)(entities_1.ApprovalStep)),
    __param(8, (0, typeorm_1.InjectRepository)(entities_1.ApprovalHistory)),
    __param(9, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(10, (0, typeorm_1.InjectRepository)(entities_1.Supplier)),
    __param(11, (0, typeorm_1.InjectRepository)(entities_1.User)),
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
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], PurchasingService);
//# sourceMappingURL=purchasing.service.js.map