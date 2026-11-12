import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalHistory,
  ApprovalStatus,
  GoodsReceiptStatus,
  Product,
  Supplier,
  User,
  isValidObjectId,
  refId,
  asDoc,
  extractUserAccess,
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PurchasingService {
  constructor(
    @InjectModel(PurchaseRequest.name) private prModel: Model<PurchaseRequest>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(GoodsReceipt.name) private grModel: Model<GoodsReceipt>,
    @InjectModel(ApprovalWorkflow.name) private workflowModel: Model<ApprovalWorkflow>,
    @InjectModel(ApprovalStep.name) private stepModel: Model<ApprovalStep>,
    @InjectModel(ApprovalHistory.name) private historyModel: Model<ApprovalHistory>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  // --- PURCHASE REQUESTS (PR) ---

  async findPRs() {
    return this.prModel
      .find()
      .populate(['requester', 'items.product'])
      .sort({ code: -1 })
      .exec();
  }

  async findPR(id: string) {
    let pr: any = null;
    if (isValidObjectId(id)) {
      pr = await this.prModel
        .findById(id)
        .populate(['requester', 'items.product'])
        .exec();
    }
    if (!pr && id.startsWith('pr-')) {
      const idx = parseInt(id.substring(3), 10);
      if (!isNaN(idx)) {
        const code = `PR-2026-${String(idx).padStart(5, '0')}`;
        pr = await this.prModel
          .findOne({ code })
          .populate(['requester', 'items.product'])
          .exec();
      }
    }
    if (!pr) throw new NotFoundException('Purchase Request not found');
    return pr;
  }

  async createPR(
    user: User,
    itemsDto: Array<{ productId: string; quantity: number; estimatedPrice: number }>,
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

    const prCount = await this.prModel.countDocuments().exec();
    const code = `PR-2026-${String(prCount + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const items: Array<{ product: any; quantity: number; estimatedPrice: number; totalPrice: number }> = [];

    for (const itemDto of itemsDto) {
      if (!isValidObjectId(itemDto.productId)) {
        throw new NotFoundException(`Product ${itemDto.productId} not found`);
      }
      const product = await this.productModel.findById(itemDto.productId).exec();
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

      const totalPrice = itemDto.quantity * itemDto.estimatedPrice;
      totalAmount += totalPrice;

      items.push({
        product: product._id,
        quantity: itemDto.quantity,
        estimatedPrice: itemDto.estimatedPrice,
        totalPrice,
      });
    }

    const created = await this.prModel.create({
      code,
      requester: refId(user),
      status: ApprovalStatus.DRAFT,
      totalAmount,
      items,
    });

    await this.logApprovalHistory(
      'PURCHASE_REQUEST',
      created.id,
      user,
      'CREATE',
      'Created draft Purchase Request',
      null,
      ApprovalStatus.DRAFT,
    );

    return this.findPR(created.id);
  }

  async submitPR(id: string, user: User) {
    const pr = await this.findPR(id);
    if (pr.status !== ApprovalStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchase requests can be submitted');
    }

    const workflows = await this.workflowModel
      .find({ targetType: 'PURCHASE_REQUEST', isActive: true })
      .exec();

    const matchingWorkflow = workflows.find(
      (w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount),
    );

    if (!matchingWorkflow) {
      pr.status = ApprovalStatus.APPROVED;
      await pr.save();
      await this.logApprovalHistory(
        'PURCHASE_REQUEST',
        pr.id,
        user,
        'AUTO_APPROVE',
        'Auto-approved, no matching threshold workflow',
        ApprovalStatus.DRAFT,
        ApprovalStatus.APPROVED,
      );
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    pr.status = ApprovalStatus.PENDING_APPROVAL;
    await pr.save();

    const firstStep = await this.stepModel
      .findOne({ workflow: matchingWorkflow._id, stepOrder: 1 })
      .populate('role')
      .exec();

    await this.logApprovalHistory(
      'PURCHASE_REQUEST',
      pr.id,
      user,
      'SUBMIT',
      'Submitted for approval',
      ApprovalStatus.DRAFT,
      ApprovalStatus.PENDING_APPROVAL,
    );

    if (firstStep?.role) {
      await this.notificationsService.create({
        title: 'PR Pending Approval',
        message: `Purchase Request ${pr.code} (Total: ${pr.totalAmount} THB) is waiting for approval`,
        recipientRole: asDoc(firstStep.role).name,
        entityType: 'PURCHASE_REQUEST',
        entityId: pr.id,
      });
    }

    return this.findPR(pr.id);
  }

  async approvePR(id: string, comment: string, user: User) {
    const pr = await this.findPR(id);
    if (pr.status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Request is not pending approval');
    }

    const workflows = await this.workflowModel
      .find({ targetType: 'PURCHASE_REQUEST', isActive: true })
      .exec();
    const matchingWorkflow = workflows.find(
      (w) => pr.totalAmount >= Number(w.minAmount) && pr.totalAmount <= Number(w.maxAmount),
    );

    if (!matchingWorkflow) {
      pr.status = ApprovalStatus.APPROVED;
      await pr.save();
      await this.logApprovalHistory(
        'PURCHASE_REQUEST',
        pr.id,
        user,
        'APPROVE',
        comment,
        ApprovalStatus.PENDING_APPROVAL,
        ApprovalStatus.APPROVED,
      );
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    const history = await this.historyModel
      .find({ entityType: 'PURCHASE_REQUEST', entityId: pr.id, action: 'APPROVE' })
      .sort({ createdAt: 1 })
      .exec();

    const steps = await this.stepModel
      .find({ workflow: matchingWorkflow._id })
      .populate('role')
      .sort({ stepOrder: 1 })
      .exec();

    const nextStepIndex = history.length;

    if (nextStepIndex >= steps.length) {
      pr.status = ApprovalStatus.APPROVED;
      await pr.save();
      await this.logApprovalHistory(
        'PURCHASE_REQUEST',
        pr.id,
        user,
        'APPROVE',
        comment,
        ApprovalStatus.PENDING_APPROVAL,
        ApprovalStatus.APPROVED,
      );
      await this.generatePOFromPR(pr, user);
      return pr;
    }

    const currentStepToApprove = steps[nextStepIndex];
    const stepRole = asDoc(currentStepToApprove.role);
    const { roleNames, roleIds } = extractUserAccess(user);
    const userHasRole = roleIds.includes(stepRole.id) || roleNames.includes('Super Admin');
    if (!userHasRole) {
      throw new BadRequestException(`Approver must have the role: ${stepRole.name}`);
    }

    const isLastStep = nextStepIndex === steps.length - 1;
    await this.logApprovalHistory(
      'PURCHASE_REQUEST',
      pr.id,
      user,
      'APPROVE',
      `Step ${currentStepToApprove.stepOrder} Approved: ${comment}`,
      ApprovalStatus.PENDING_APPROVAL,
      isLastStep ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING_APPROVAL,
    );

    if (isLastStep) {
      pr.status = ApprovalStatus.APPROVED;
      await pr.save();

      await this.notificationsService.create({
        title: 'PR Approved',
        message: `Your Purchase Request ${pr.code} has been approved.`,
        recipientId: pr.requester?.id ?? String(pr.requester),
        entityType: 'PURCHASE_REQUEST',
        entityId: pr.id,
      });

      await this.generatePOFromPR(pr, user);
    } else {
      const nextStep = steps[nextStepIndex + 1];
      await this.notificationsService.create({
        title: 'PR Pending Approval (Next Step)',
        message: `Purchase Request ${pr.code} (Total: ${pr.totalAmount} THB) is waiting for step ${nextStep.stepOrder} approval.`,
        recipientRole: asDoc(nextStep.role).name,
        entityType: 'PURCHASE_REQUEST',
        entityId: pr.id,
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
    await pr.save();

    await this.logApprovalHistory(
      'PURCHASE_REQUEST',
      pr.id,
      user,
      'REJECT',
      comment,
      ApprovalStatus.PENDING_APPROVAL,
      ApprovalStatus.REJECTED,
    );

    await this.notificationsService.create({
      title: 'PR Rejected',
      message: `Your Purchase Request ${pr.code} was rejected. Reason: ${comment}`,
      recipientId: pr.requester?.id ?? String(pr.requester),
      entityType: 'PURCHASE_REQUEST',
      entityId: pr.id,
    });

    return pr;
  }

  // --- PURCHASE ORDERS (PO) ---

  async findPOs() {
    return this.poModel
      .find()
      .populate(['supplier', 'buyer', 'items.product'])
      .sort({ code: -1 })
      .exec();
  }

  async findPO(id: string) {
    let po: any = null;
    if (isValidObjectId(id)) {
      po = await this.poModel
        .findById(id)
        .populate(['supplier', 'buyer', 'items.product'])
        .exec();
    }
    if (!po && id.startsWith('po-')) {
      const idx = parseInt(id.substring(3), 10);
      if (!isNaN(idx)) {
        const code = `PO-2026-${String(idx).padStart(5, '0')}`;
        po = await this.poModel
          .findOne({ code })
          .populate(['supplier', 'buyer', 'items.product'])
          .exec();
      }
    }
    if (!po) throw new NotFoundException('Purchase Order not found');
    return po;
  }

  private async generatePOFromPR(pr: PurchaseRequest, user: User) {
    const poCount = await this.poModel.countDocuments().exec();
    const code = `PO-2026-${String(poCount + 1).padStart(5, '0')}`;

    const supplier = await this.supplierModel.findOne().sort({ name: 1 }).exec();
    if (!supplier) return;

    const poItems = pr.items.map((prItem) => ({
      product: refId(prItem.product),
      quantity: prItem.quantity,
      price: prItem.estimatedPrice,
      totalPrice: prItem.totalPrice,
    }));

    const po = await this.poModel.create({
      code,
      supplier: supplier._id,
      buyer: refId(user),
      status: ApprovalStatus.APPROVED,
      totalAmount: pr.totalAmount,
      items: poItems,
      purchaseRequest: pr._id,
    });

    await this.notificationsService.create({
      title: 'New PO Generated',
      message: `Purchase Order ${code} has been generated from PR ${pr.code}`,
      recipientRole: 'Purchasing',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
    });
  }

  // --- GOODS RECEIPTS (GR) ---

  async findGRs() {
    return this.grModel
      .find()
      .populate({ path: 'purchaseOrder', populate: { path: 'supplier' } })
      .populate(['receivedBy', 'items.product'])
      .sort({ code: -1 })
      .exec();
  }

  async findGR(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Goods Receipt not found');
    }
    const gr = await this.grModel
      .findById(id)
      .populate({ path: 'purchaseOrder', populate: { path: 'supplier' } })
      .populate(['receivedBy', 'items.product'])
      .exec();
    if (!gr) throw new NotFoundException('Goods Receipt not found');
    return gr;
  }

  async createGR(
    poId: string,
    receivedById: string,
    itemsDto: Array<{ productId: string; quantityReceived: number }>,
  ) {
    const po = await this.findPO(poId);
    if (!isValidObjectId(receivedById)) {
      throw new NotFoundException('Receiving user not found');
    }
    const receivedBy = await this.userModel.findById(receivedById).exec();

    if (!receivedBy) throw new NotFoundException('Receiving user not found');
    if (po.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Can only receive goods for an APPROVED Purchase Order');
    }

    const grCount = await this.grModel.countDocuments().exec();
    const code = `GR-2026-${String(grCount + 1).padStart(5, '0')}`;

    const items: Array<{
      product: any;
      quantityReceived: number;
      quantityAccepted: number;
      quantityRejected: number;
    }> = [];

    for (const itemDto of itemsDto) {
      if (!isValidObjectId(itemDto.productId)) {
        throw new NotFoundException(`Product ${itemDto.productId} not found`);
      }
      const product = await this.productModel.findById(itemDto.productId).exec();
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

      items.push({
        product: product._id,
        quantityReceived: itemDto.quantityReceived,
        quantityAccepted: 0,
        quantityRejected: 0,
      });
    }

    const created = await this.grModel.create({
      code,
      purchaseOrder: po._id,
      receivedBy: receivedBy._id,
      status: GoodsReceiptStatus.PENDING_QA,
      items,
    });

    await this.notificationsService.create({
      title: 'Goods QA Inspection Required',
      message: `Goods Receipt ${code} (PO: ${po.code}) requires quality inspection.`,
      recipientRole: 'QA',
      entityType: 'GOODS_RECEIPT',
      entityId: created.id,
    });

    await this.auditService.log({
      action: 'CREATE_GOODS_RECEIPT',
      entityName: 'GoodsReceipt',
      entityId: created.id,
      afterState: { code, poCode: po.code },
      userEmail: receivedBy.email,
    });

    return this.findGR(created.id);
  }

  // --- HELPERS ---

  private async logApprovalHistory(
    entityType: string,
    entityId: string,
    user: User,
    action: string,
    comment: string,
    previousStatus: string | null,
    newStatus: string | null,
  ) {
    await this.historyModel.create({
      entityType,
      entityId,
      user: refId(user),
      action,
      comment,
      previousStatus,
      newStatus,
    });
  }

  async getApprovalHistory(entityType: string, entityId: string) {
    return this.historyModel
      .find({ entityType, entityId })
      .populate('user')
      .sort({ createdAt: 1 })
      .exec();
  }
}
