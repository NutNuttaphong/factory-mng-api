import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalHistory,
  ApprovalStatus,
  GoodsReceiptStatus,
  Product,
  Supplier,
  User,
  Role
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PurchasingService {
  constructor(
    @InjectRepository(PurchaseRequest) private prRepo: Repository<PurchaseRequest>,
    @InjectRepository(PurchaseRequestItem) private prItemRepo: Repository<PurchaseRequestItem>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private poItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(GoodsReceipt) private grRepo: Repository<GoodsReceipt>,
    @InjectRepository(GoodsReceiptItem) private grItemRepo: Repository<GoodsReceiptItem>,
    @InjectRepository(ApprovalWorkflow) private workflowRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(ApprovalStep) private stepRepo: Repository<ApprovalStep>,
    @InjectRepository(ApprovalHistory) private historyRepo: Repository<ApprovalHistory>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private notificationsService: NotificationsService,
    private auditService: AuditService
  ) {}

  // --- PURCHASE REQUESTS (PR) ---

  async findPRs() {
    return this.prRepo.find({
      relations: { requester: true, items: { product: true } },
      order: { code: 'DESC' }
    });
  }

  async findPR(id: string) {
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
    if (!pr) throw new NotFoundException('Purchase Request not found');
    return pr;
  }

  async createPR(
    user: User,
    itemsDto: Array<{ productId: string; quantity: number; estimatedPrice: number }>
  ) {
    if (!Array.isArray(itemsDto) || itemsDto.length === 0) {
      throw new BadRequestException('Purchase request must include at least one item');
    }

    for (const itemDto of itemsDto) {
      if (!Number.isFinite(itemDto.quantity) || itemDto.quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than zero');
      }
      if (!Number.isFinite(itemDto.estimatedPrice) || itemDto.estimatedPrice < 0) {
        throw new BadRequestException('Item estimated price cannot be negative');
      }
    }

    const prCount = await this.prRepo.count();
    const code = `PR-2026-${String(prCount + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const items: PurchaseRequestItem[] = [];

    for (const itemDto of itemsDto) {
      const product = await this.productRepo.findOneBy({ id: itemDto.productId });
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

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
      status: ApprovalStatus.DRAFT,
      totalAmount,
      items
    });

    const savedPr = await this.prRepo.save(pr);

    await this.logApprovalHistory('PURCHASE_REQUEST', savedPr.id, user, 'CREATE', 'Created draft Purchase Request', null, ApprovalStatus.DRAFT);
    return savedPr;
  }

  async submitPR(id: string, user: User) {
    const pr = await this.findPR(id);
    if (pr.status !== ApprovalStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchase requests can be submitted');
    }

    // Determine Approval Workflow based on amount
    const workflow = await this.workflowRepo.findOne({
      where: { targetType: 'PURCHASE_REQUEST', isActive: true },
      // Check which workflow matches the PR amount bounds
    });

    // Let's query workflows and find the one where totalAmount falls within min/max
    const workflows = await this.workflowRepo.find({
      where: { targetType: 'PURCHASE_REQUEST', isActive: true }
    });

    const matchingWorkflow = workflows.find(
      (w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount)
    );

    if (!matchingWorkflow) {
      // Direct approval if no workflow configured
      pr.status = ApprovalStatus.APPROVED;
      await this.prRepo.save(pr);
      await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'AUTO_APPROVE', 'Auto-approved, no matching threshold workflow', ApprovalStatus.DRAFT, ApprovalStatus.APPROVED);
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    // Start approval steps
    pr.status = ApprovalStatus.PENDING_APPROVAL;
    const savedPr = await this.prRepo.save(pr);

    // Find first step
    const firstStep = await this.stepRepo.findOne({
      where: { workflow: { id: matchingWorkflow.id }, stepOrder: 1 },
      relations: { role: true }
    });

    await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'SUBMIT', 'Submitted for approval', ApprovalStatus.DRAFT, ApprovalStatus.PENDING_APPROVAL);

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

  async approvePR(id: string, comment: string, user: User) {
    const pr = await this.findPR(id);
    if (pr.status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Request is not pending approval');
    }

    // Find matching workflow
    const workflows = await this.workflowRepo.find({ where: { targetType: 'PURCHASE_REQUEST', isActive: true } });
    const matchingWorkflow = workflows.find(
      (w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount)
    );

    if (!matchingWorkflow) {
      pr.status = ApprovalStatus.APPROVED;
      await this.prRepo.save(pr);
      await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'APPROVE', comment, ApprovalStatus.PENDING_APPROVAL, ApprovalStatus.APPROVED);
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    // Get current approved steps from history
    const history = await this.historyRepo.find({
      where: { entityType: 'PURCHASE_REQUEST', entityId: pr.id, action: 'APPROVE' },
      order: { createdAt: 'ASC' }
    });

    const steps = await this.stepRepo.find({
      where: { workflow: { id: matchingWorkflow.id } },
      relations: { role: true },
      order: { stepOrder: 'ASC' }
    });

    const nextStepIndex = history.length; // E.g. if 0 approved, next index is 0 (stepOrder 1)

    if (nextStepIndex >= steps.length) {
      // Already fully approved
      pr.status = ApprovalStatus.APPROVED;
      await this.prRepo.save(pr);
      await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'APPROVE', comment, ApprovalStatus.PENDING_APPROVAL, ApprovalStatus.APPROVED);
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    const currentStepToApprove = steps[nextStepIndex];
    // Check if user has the role required for current step
    const userHasRole = user.roles.some((r) => r.id === currentStepToApprove.role.id || r.name === 'Super Admin');
    if (!userHasRole) {
      throw new BadRequestException(`Approver must have the role: ${currentStepToApprove.role.name}`);
    }

    // Log this step approval
    await this.logApprovalHistory(
      'PURCHASE_REQUEST',
      pr.id,
      user,
      'APPROVE',
      `Step ${currentStepToApprove.stepOrder} Approved: ${comment}`,
      ApprovalStatus.PENDING_APPROVAL,
      nextStepIndex === steps.length - 1 ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING_APPROVAL
    );

    if (nextStepIndex === steps.length - 1) {
      // Last step approved
      pr.status = ApprovalStatus.APPROVED;
      await this.prRepo.save(pr);

      // Notify requester
      await this.notificationsService.create({
        title: 'PR Approved',
        message: `Your Purchase Request ${pr.code} has been approved.`,
        recipientId: pr.requester.id,
        entityType: 'PURCHASE_REQUEST',
        entityId: pr.id
      });

      // Automatically generate PO
      await this.generatePOFromPR(pr, user);
    } else {
      // Advance to next step
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

  async rejectPR(id: string, comment: string, user: User) {
    const pr = await this.findPR(id);
    if (pr.status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Request is not pending approval');
    }

    pr.status = ApprovalStatus.REJECTED;
    await this.prRepo.save(pr);

    await this.logApprovalHistory('PURCHASE_REQUEST', pr.id, user, 'REJECT', comment, ApprovalStatus.PENDING_APPROVAL, ApprovalStatus.REJECTED);

    await this.notificationsService.create({
      title: 'PR Rejected',
      message: `Your Purchase Request ${pr.code} was rejected. Reason: ${comment}`,
      recipientId: pr.requester.id,
      entityType: 'PURCHASE_REQUEST',
      entityId: pr.id
    });

    return pr;
  }

  // --- PURCHASE ORDERS (PO) ---

  async findPOs() {
    return this.poRepo.find({
      relations: { supplier: true, buyer: true, items: { product: true } },
      order: { code: 'DESC' }
    });
  }

  async findPO(id: string) {
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
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  private async generatePOFromPR(pr: PurchaseRequest, user: User) {
    const poCount = await this.poRepo.count();
    const code = `PO-2026-${String(poCount + 1).padStart(5, '0')}`;

    // Find default supplier for PO (usually set by buyer; we pick ABC Manufacturing or default supplier of first product)
    const supplier = await this.supplierRepo.findOne({ order: { name: 'ASC' } });
    if (!supplier) return; // Silent skip if no supplier is registered yet

    const poItems: PurchaseOrderItem[] = [];
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
      status: ApprovalStatus.APPROVED, // Auto approve PO if PR is approved
      totalAmount: pr.totalAmount,
      items: poItems,
      purchaseRequest: pr
    });

    await this.poRepo.save(po);

    // Notify purchasing team
    await this.notificationsService.create({
      title: 'New PO Generated',
      message: `Purchase Order ${code} has been generated from PR ${pr.code}`,
      recipientRole: 'Purchasing',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id
    });
  }

  // --- GOODS RECEIPTS (GR) ---

  async findGRs() {
    return this.grRepo.find({
      relations: { purchaseOrder: { supplier: true }, receivedBy: true, items: { product: true } },
      order: { code: 'DESC' }
    });
  }

  async findGR(id: string) {
    const gr = await this.grRepo.findOne({
      where: { id },
      relations: { purchaseOrder: { supplier: true }, receivedBy: true, items: { product: true } }
    });
    if (!gr) throw new NotFoundException('Goods Receipt not found');
    return gr;
  }

  async createGR(
    poId: string,
    receivedById: string,
    itemsDto: Array<{ productId: string; quantityReceived: number }>
  ) {
    const po = await this.findPO(poId);
    const receivedBy = await this.userRepo.findOneBy({ id: receivedById });

    if (!receivedBy) throw new NotFoundException('Receiving user not found');
    if (po.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Can only receive goods for an APPROVED Purchase Order');
    }

    const grCount = await this.grRepo.count();
    const code = `GR-2026-${String(grCount + 1).padStart(5, '0')}`;

    const items: GoodsReceiptItem[] = [];
    for (const itemDto of itemsDto) {
      const product = await this.productRepo.findOneBy({ id: itemDto.productId });
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

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
      status: GoodsReceiptStatus.PENDING_QA,
      items
    });

    const savedGr = await this.grRepo.save(gr);

    // Notify QA to inspect the shipment
    await this.notificationsService.create({
      title: 'Goods QA Inspection Required',
      message: `Goods Receipt ${code} (PO: ${po.code}) requires quality inspection.`,
      recipientRole: 'QA',
      entityType: 'GOODS_RECEIPT',
      entityId: savedGr.id
    });

    // Log to Audit Log
    await this.auditService.log({
      action: 'CREATE_GOODS_RECEIPT',
      entityName: 'GoodsReceipt',
      entityId: savedGr.id,
      afterState: { code, poCode: po.code },
      userEmail: receivedBy.email
    });

    return savedGr;
  }

  // --- HELPERS ---

  private async logApprovalHistory(
    entityType: string,
    entityId: string,
    user: User,
    action: string,
    comment: string,
    previousStatus: string | null,
    newStatus: string | null
  ) {
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

  async getApprovalHistory(entityType: string, entityId: string) {
    return this.historyRepo.find({
      where: { entityType, entityId },
      relations: { user: true },
      order: { createdAt: 'ASC' }
    });
  }
}
