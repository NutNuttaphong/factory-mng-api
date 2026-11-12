import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProductionPlan,
  WorkOrder,
  MaterialIssue,
  ProductionResult,
  BOM,
  BOMItem,
  WorkOrderStatus,
  Product,
  Warehouse,
  User,
  Stock
} from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionPlan) private planRepo: Repository<ProductionPlan>,
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(MaterialIssue) private issueRepo: Repository<MaterialIssue>,
    @InjectRepository(ProductionResult) private resultRepo: Repository<ProductionResult>,
    @InjectRepository(BOM) private bomRepo: Repository<BOM>,
    @InjectRepository(BOMItem) private bomItemRepo: Repository<BOMItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService
  ) {}

  // --- BILL OF MATERIALS (BOM) ---

  async findBOMs() {
    return this.bomRepo.find({
      relations: { product: true, items: { product: true } },
      order: { code: 'ASC' }
    });
  }

  async createBOM(dto: { code: string; productId: string; description?: string; items: Array<{ productId: string; quantityNeeded: number }> }) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('BOM must include at least one component item');
    }
    for (const itemDto of dto.items) {
      if (!Number.isFinite(itemDto.quantityNeeded) || itemDto.quantityNeeded <= 0) {
        throw new BadRequestException('BOM component quantityNeeded must be greater than zero');
      }
    }

    const product = await this.productRepo.findOneBy({ id: dto.productId });
    if (!product) throw new NotFoundException('Finished product not found');

    const bom = this.bomRepo.create({
      code: dto.code,
      product,
      description: dto.description,
      isActive: true,
      items: []
    });

    const savedBom = await this.bomRepo.save(bom);

    const items: BOMItem[] = [];
    for (const itemDto of dto.items) {
      const comp = await this.productRepo.findOneBy({ id: itemDto.productId });
      if (!comp) throw new NotFoundException(`Component product ${itemDto.productId} not found`);

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

  // --- PRODUCTION PLANS ---

  async findPlans() {
    return this.planRepo.find({
      relations: { product: true },
      order: { createdAt: 'DESC' }
    });
  }

  async createPlan(dto: { productId: string; targetQuantity: number; startDate: Date; endDate: Date }) {
    if (!Number.isFinite(dto.targetQuantity) || dto.targetQuantity <= 0) {
      throw new BadRequestException('Target quantity must be greater than zero');
    }
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('Plan endDate cannot be earlier than startDate');
    }

    const product = await this.productRepo.findOneBy({ id: dto.productId });
    if (!product) throw new NotFoundException('Product not found');

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

  // --- WORK ORDERS (WO) ---

  async findWorkOrders() {
    return this.woRepo.find({
      relations: { productionPlan: true, product: true, assignedTo: true },
      order: { code: 'DESC' }
    });
  }

  async findWorkOrder(id: string) {
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
    if (!wo) throw new NotFoundException('Work Order not found');
    return wo;
  }

  async createWorkOrder(dto: { productionPlanId?: string; productId: string; quantity: number; assignedToId: string }) {
    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('Work order quantity must be greater than zero');
    }

    const product = await this.productRepo.findOneBy({ id: dto.productId });
    const assignedTo = await this.userRepo.findOne({
      where: [
        { id: dto.assignedToId },
        { email: dto.assignedToId }
      ]
    });

    if (!product || !assignedTo) throw new NotFoundException('Product or Operator not found');

    let plan: ProductionPlan | null = null;
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
      status: WorkOrderStatus.DRAFT,
      assignedTo
    });

    return this.woRepo.save(wo);
  }

  // --- MATERIAL REQUIREMENT & CHECK ---

  async checkMaterialRequirement(woId: string) {
    const wo = await this.findWorkOrder(woId);
    const bom = await this.bomRepo.findOne({
      where: { product: { id: wo.product.id }, isActive: true },
      relations: { items: { product: true } }
    });

    if (!bom) {
      throw new BadRequestException(`No active Bill of Materials found for product ${wo.product.code}`);
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

    // We assume checking in the main warehouse of the raw materials (WH-A)
    for (const bomItem of bom.items) {
      const requiredQty = Number(bomItem.quantityNeeded) * wo.quantity;

      // Query current stock of component product
      const stock = await this.stockRepo.findOne({
        where: { product: { id: bomItem.product.id } } // Sum or get specific
      });

      const currentQty = stock ? stock.quantity : 0;
      const isAvailable = currentQty >= requiredQty;
      if (!isAvailable) allAvailable = false;

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

  // --- MATERIAL ISSUE (STOCK OUT MATERIALS) ---

  async issueMaterials(woId: string, warehouseId: string, user: User) {
    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.DRAFT && wo.status !== WorkOrderStatus.PENDING_MATERIAL) {
      throw new BadRequestException('Materials can only be issued for DRAFT or PENDING_MATERIAL orders');
    }

    const check = await this.checkMaterialRequirement(woId);
    if (!check.allAvailable) {
      wo.status = WorkOrderStatus.PENDING_MATERIAL;
      await this.woRepo.save(wo);
      throw new BadRequestException('Cannot issue materials, stock is insufficient for some components');
    }

    const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const issueItems: Array<{
      productId: string;
      productCode: string;
      productName: string;
      quantityRequired: number;
      quantityIssued: number;
    }> = [];

    // Perform actual stock out for each component
    for (const req of check.requirements) {
      await this.inventoryService.stockOut(
        req.productId,
        warehouse.id,
        req.requiredQty,
        'WORK_ORDER_ISSUE',
        wo.id,
        user
      );

      issueItems.push({
        productId: req.productId,
        productCode: req.code,
        productName: req.name,
        quantityRequired: req.requiredQty,
        quantityIssued: req.requiredQty
      });
    }

    // Save Material Issue log
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

    // Advance WO status
    wo.status = WorkOrderStatus.MATERIAL_ISSUED;
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

  // --- START PRODUCTION ---

  async startProduction(woId: string) {
    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.MATERIAL_ISSUED) {
      throw new BadRequestException('Cannot start production. Materials must be ISSUED first.');
    }

    wo.status = WorkOrderStatus.IN_PRODUCTION;
    return this.woRepo.save(wo);
  }

  // --- REPORT RESULT (SUBMIT TO QA) ---

  async reportResult(woId: string, qtyProduced: number, qtyDefective: number, notes: string, user: User) {
    if (!Number.isFinite(qtyProduced) || qtyProduced < 0 || !Number.isFinite(qtyDefective) || qtyDefective < 0) {
      throw new BadRequestException('Production quantities cannot be negative');
    }

    const wo = await this.findWorkOrder(woId);
    if (wo.status !== WorkOrderStatus.IN_PRODUCTION) {
      throw new BadRequestException('Can only report results for orders currently IN_PRODUCTION');
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

    // Advance WO status to PENDING_QA
    wo.status = WorkOrderStatus.PENDING_QA;
    await this.woRepo.save(wo);

    // Auto-create notification for QA
    await this.notificationsService.create({
      title: 'Production QA Inspection Required',
      message: `Work Order ${wo.code} completed production of ${qtyProduced} units. QA inspection required.`,
      recipientRole: 'QA',
      entityType: 'WORK_ORDER',
      entityId: wo.id
    });

    // Audit logs
    await this.auditService.log({
      action: 'PRODUCTION_REPORT',
      entityName: 'WorkOrder',
      entityId: wo.id,
      afterState: { qtyProduced, qtyDefective },
      userEmail: user.email
    });

    return result;
  }
}
