import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProductionPlan,
  WorkOrder,
  MaterialIssue,
  ProductionResult,
  BOM,
  WorkOrderStatus,
  Product,
  Warehouse,
  User,
  Stock,
  isValidObjectId,
  refId,
  asDoc,
} from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(ProductionPlan.name) private planModel: Model<ProductionPlan>,
    @InjectModel(WorkOrder.name) private woModel: Model<WorkOrder>,
    @InjectModel(MaterialIssue.name) private issueModel: Model<MaterialIssue>,
    @InjectModel(ProductionResult.name) private resultModel: Model<ProductionResult>,
    @InjectModel(BOM.name) private bomModel: Model<BOM>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<Warehouse>,
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
    @InjectModel(User.name) private userModel: Model<User>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  // --- BILL OF MATERIALS (BOM) ---

  async findBOMs() {
    return this.bomModel
      .find()
      .populate(['product', 'items.product'])
      .sort({ code: 1 })
      .exec();
  }

  async createBOM(dto: {
    code: string;
    productId: string;
    description?: string;
    items: Array<{ productId: string; quantityNeeded: number }>;
  }) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('BOM must include at least one component item');
    }
    for (const itemDto of dto.items) {
      if (!Number.isFinite(itemDto.quantityNeeded) || itemDto.quantityNeeded <= 0) {
        throw new BadRequestException('BOM component quantityNeeded must be greater than zero');
      }
    }

    if (!isValidObjectId(dto.productId)) {
      throw new NotFoundException('Finished product not found');
    }
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) throw new NotFoundException('Finished product not found');

    const items: Array<{ product: any; quantityNeeded: number }> = [];
    for (const itemDto of dto.items) {
      if (!isValidObjectId(itemDto.productId)) {
        throw new NotFoundException(`Component product ${itemDto.productId} not found`);
      }
      const comp = await this.productModel.findById(itemDto.productId).exec();
      if (!comp) throw new NotFoundException(`Component product ${itemDto.productId} not found`);
      items.push({ product: comp._id, quantityNeeded: itemDto.quantityNeeded });
    }

    const created = await this.bomModel.create({
      code: dto.code,
      product: product._id,
      description: dto.description ?? null,
      isActive: true,
      items,
    });

    return this.bomModel.findById(created.id).populate(['product', 'items.product']).exec();
  }

  // --- PRODUCTION PLANS ---

  async findPlans() {
    return this.planModel
      .find()
      .populate('product')
      .sort({ createdAt: -1 })
      .exec();
  }

  async createPlan(dto: { productId: string; targetQuantity: number; startDate: Date; endDate: Date }) {
    if (!Number.isFinite(dto.targetQuantity) || dto.targetQuantity <= 0) {
      throw new BadRequestException('Target quantity must be greater than zero');
    }
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('Plan endDate cannot be earlier than startDate');
    }

    if (!isValidObjectId(dto.productId)) {
      throw new NotFoundException('Product not found');
    }
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    const planCount = await this.planModel.countDocuments().exec();
    const code = `PLN-2026-${String(planCount + 1).padStart(5, '0')}`;

    const created = await this.planModel.create({
      code,
      product: product._id,
      targetQuantity: dto.targetQuantity,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'PENDING',
    });

    return this.planModel.findById(created.id).populate('product').exec();
  }

  // --- WORK ORDERS (WO) ---

  async findWorkOrders() {
    return this.woModel
      .find()
      .populate(['productionPlan', 'product', 'assignedTo'])
      .sort({ code: -1 })
      .exec();
  }

  async findWorkOrder(id: string) {
    let wo: any = null;
    if (isValidObjectId(id)) {
      wo = await this.woModel
        .findById(id)
        .populate(['productionPlan', 'product', 'assignedTo'])
        .exec();
    }
    if (!wo && id.startsWith('wo-')) {
      const idx = parseInt(id.substring(3), 10);
      if (!isNaN(idx)) {
        const code = `WO-2026-${String(idx).padStart(5, '0')}`;
        wo = await this.woModel
          .findOne({ code })
          .populate(['productionPlan', 'product', 'assignedTo'])
          .exec();
      }
    }
    if (!wo) throw new NotFoundException('Work Order not found');
    return wo;
  }

  async createWorkOrder(dto: {
    productionPlanId?: string;
    productId: string;
    quantity: number;
    assignedToId: string;
  }) {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('Work order quantity must be greater than zero');
    }

    if (!isValidObjectId(dto.productId)) {
      throw new NotFoundException('Product or Operator not found');
    }
    const product = await this.productModel.findById(dto.productId).exec();
    const assignedTo = isValidObjectId(dto.assignedToId)
      ? await this.userModel.findById(dto.assignedToId).exec()
      : await this.userModel.findOne({ email: dto.assignedToId.trim().toLowerCase() }).exec();

    if (!product || !assignedTo) throw new NotFoundException('Product or Operator not found');

    let plan: any = null;
    if (dto.productionPlanId && isValidObjectId(dto.productionPlanId)) {
      plan = await this.planModel.findById(dto.productionPlanId).exec();
      if (plan) {
        plan.status = 'ACTIVE';
        await plan.save();
      }
    }

    const woCount = await this.woModel.countDocuments().exec();
    const code = `WO-2026-${String(woCount + 1).padStart(5, '0')}`;

    const created = await this.woModel.create({
      code,
      productionPlan: plan ? plan._id : null,
      product: product._id,
      quantity: dto.quantity,
      status: WorkOrderStatus.DRAFT,
      assignedTo: assignedTo._id,
    });

    return this.findWorkOrder(created.id);
  }

  // --- MATERIAL REQUIREMENT & CHECK ---

  async checkMaterialRequirement(woId: string) {
    const wo = await this.findWorkOrder(woId);
    const bom = await this.bomModel
      .findOne({ product: refId(wo.product), isActive: true })
      .populate('items.product')
      .exec();

    if (!bom) {
      throw new BadRequestException(
        `No active Bill of Materials found for product ${wo.product.code}`,
      );
    }

    const requirements: Array<{
      productId: string;
      code: string;
      name: string;
      requiredQty: number;
      availableQty: number;
      isAvailable: boolean;
    }> = [];
    let allAvailable = true;

    for (const bomItem of bom.items) {
      const requiredQty = Number(bomItem.quantityNeeded) * wo.quantity;
      const stock = await this.stockModel.findOne({ product: refId(bomItem.product) }).exec();

      const currentQty = stock ? stock.quantity : 0;
      const isAvailable = currentQty >= requiredQty;
      if (!isAvailable) allAvailable = false;

      const prod = asDoc(bomItem.product);
      requirements.push({
        productId: prod.id,
        code: prod.code,
        name: prod.name,
        requiredQty,
        availableQty: currentQty,
        isAvailable,
      });
    }

    const woProduct = asDoc(wo.product);
    return {
      workOrderId: wo.id,
      workOrderCode: wo.code,
      productCode: woProduct.code,
      productName: woProduct.name,
      targetQty: wo.quantity,
      allAvailable,
      requirements,
    };
  }

  // --- MATERIAL ISSUE (STOCK OUT MATERIALS) ---

  async issueMaterials(woId: string, warehouseId: string, user: User) {
    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.DRAFT && wo.status !== WorkOrderStatus.PENDING_MATERIAL) {
      throw new BadRequestException(
        'Materials can only be issued for DRAFT or PENDING_MATERIAL orders',
      );
    }

    const check = await this.checkMaterialRequirement(woId);
    if (!check.allAvailable) {
      wo.status = WorkOrderStatus.PENDING_MATERIAL;
      await wo.save();
      throw new BadRequestException(
        'Cannot issue materials, stock is insufficient for some components',
      );
    }

    if (!isValidObjectId(warehouseId)) {
      throw new NotFoundException('Warehouse not found');
    }
    const warehouse = await this.warehouseModel.findById(warehouseId).exec();
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const issueItems: Array<{
      productId: string;
      productCode: string;
      productName: string;
      quantityRequired: number;
      quantityIssued: number;
    }> = [];

    for (const req of check.requirements) {
      await this.inventoryService.stockOut(
        req.productId,
        warehouse.id,
        req.requiredQty,
        'WORK_ORDER_ISSUE',
        wo.id,
        user,
      );

      issueItems.push({
        productId: req.productId,
        productCode: req.code,
        productName: req.name,
        quantityRequired: req.requiredQty,
        quantityIssued: req.requiredQty,
      });
    }

    const issueCount = await this.issueModel.countDocuments().exec();
    const code = `MI-2026-${String(issueCount + 1).padStart(5, '0')}`;

    const materialIssue = await this.issueModel.create({
      code,
      workOrder: wo._id,
      warehouse: warehouse._id,
      issuedBy: refId(user),
      items: issueItems,
    });

    wo.status = WorkOrderStatus.MATERIAL_ISSUED;
    await wo.save();

    await this.notificationsService.create({
      title: 'Materials Issued',
      message: `Materials for Work Order ${wo.code} have been successfully issued from ${warehouse.name}.`,
      recipientRole: 'Production',
      entityType: 'WORK_ORDER',
      entityId: wo.id,
    });

    return materialIssue;
  }

  // --- START PRODUCTION ---

  async startProduction(woId: string) {
    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.MATERIAL_ISSUED) {
      throw new BadRequestException('Cannot start production. Materials must be ISSUED first.');
    }

    wo.status = WorkOrderStatus.IN_PRODUCTION;
    await wo.save();
    return wo;
  }

  // --- REPORT RESULT (SUBMIT TO QA) ---

  async reportResult(
    woId: string,
    qtyProduced: number,
    qtyDefective: number,
    notes: string,
    user: User,
  ) {
    if (
      !Number.isFinite(qtyProduced) ||
      qtyProduced < 0 ||
      !Number.isFinite(qtyDefective) ||
      qtyDefective < 0
    ) {
      throw new BadRequestException('Production quantities cannot be negative');
    }

    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.IN_PRODUCTION) {
      throw new BadRequestException(
        'Can only report results for orders currently IN_PRODUCTION',
      );
    }

    const resultCount = await this.resultModel.countDocuments().exec();
    const code = `PRR-2026-${String(resultCount + 1).padStart(5, '0')}`;

    const result = await this.resultModel.create({
      code,
      workOrder: wo._id,
      quantityProduced: Number(qtyProduced),
      quantityDefective: Number(qtyDefective),
      operator: refId(user),
      notes: notes ?? null,
    });

    wo.status = WorkOrderStatus.PENDING_QA;
    await wo.save();

    await this.notificationsService.create({
      title: 'Production QA Inspection Required',
      message: `Work Order ${wo.code} completed production of ${qtyProduced} units. QA inspection required.`,
      recipientRole: 'QA',
      entityType: 'WORK_ORDER',
      entityId: wo.id,
    });

    await this.auditService.log({
      action: 'PRODUCTION_REPORT',
      entityName: 'WorkOrder',
      entityId: wo.id,
      afterState: { qtyProduced, qtyDefective },
      userEmail: user.email,
    });

    return result;
  }
}
