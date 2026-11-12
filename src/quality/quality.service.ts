import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityInspection, QualityDefect, QAStatus } from '../database/entities/quality.entity';
import { WorkOrder, WorkOrderStatus } from '../database/entities/production.entity';
import { GoodsReceipt, GoodsReceiptStatus } from '../database/entities/purchasing-inventory.entity';
import { Product, Warehouse } from '../database/entities/master.entity';
import { User } from '../database/entities/rbac.entity';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(QualityInspection) private qaRepo: Repository<QualityInspection>,
    @InjectRepository(QualityDefect) private defectRepo: Repository<QualityDefect>,
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(GoodsReceipt) private grRepo: Repository<GoodsReceipt>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService
  ) {}

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

  async createInspection(
    user: User,
    dto: {
      productId: string;
      workOrderId?: string;
      goodsReceiptId?: string;
      batchNo: string;
      weight?: number;
      size?: number;
      color?: string;
      temperature?: number;
      defectDetails?: string;
      status: QAStatus;
      comment: string;
      defectsList?: Array<{ defectType: string; severity: number; description?: string }>;
    }
  ) {
    const product = await this.productRepo.findOneBy({ id: dto.productId });
    if (!product) throw new NotFoundException('Product not found');

    const qaCount = await this.qaRepo.count();
    const code = `QA-2026-${String(qaCount + 1).padStart(5, '0')}`;

    let workOrder: WorkOrder | null = null;
    if (dto.workOrderId) {
      workOrder = await this.woRepo.findOne({ where: { id: dto.workOrderId }, relations: { product: { warehouse: true } } });
      if (!workOrder) throw new NotFoundException('Work Order not found');
    }

    let goodsReceipt: GoodsReceipt | null = null;
    if (dto.goodsReceiptId) {
      goodsReceipt = await this.grRepo.findOne({ where: { id: dto.goodsReceiptId }, relations: { items: true, purchaseOrder: true } });
      if (!goodsReceipt) throw new NotFoundException('Goods Receipt not found');
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

    // Save defect details if failed
    if (dto.defectsList && dto.defectsList.length > 0) {
      for (const d of dto.defectsList) {
        await this.defectRepo.save(
          this.defectRepo.create({
            inspection: savedQa,
            defectType: d.defectType,
            severity: d.severity,
            description: d.description
          })
        );
      }
    }

    // --- DECISION ACTION ENGINE ---

    if (goodsReceipt) {
      // Flow: Goods Receipt QA
      if (dto.status === QAStatus.PASS) {
        // Accept and stock in
        goodsReceipt.status = GoodsReceiptStatus.QA_PASSED;
        await this.grRepo.save(goodsReceipt);

        // Put each item into stock
        for (const item of goodsReceipt.items) {
          item.quantityAccepted = item.quantityReceived;
          item.quantityRejected = 0;

          // Target warehouse is the default product warehouse or PO target
          const targetWhId = product.warehouse?.id;
          if (targetWhId) {
            await this.inventoryService.stockIn(
              item.product.id,
              targetWhId,
              item.quantityReceived,
              'GOODS_RECEIPT_QA_PASS',
              goodsReceipt.id,
              user
            );
          }
        }
        await this.grRepo.save(goodsReceipt);
      } else {
        // Reject
        goodsReceipt.status = GoodsReceiptStatus.QA_FAILED;
        for (const item of goodsReceipt.items) {
          item.quantityAccepted = 0;
          item.quantityRejected = item.quantityReceived;
        }
        await this.grRepo.save(goodsReceipt);

        // Send alert
        await this.notificationsService.create({
          title: 'QA Inspection Failed',
          message: `Goods Receipt ${goodsReceipt.code} (PO: ${goodsReceipt.purchaseOrder?.code}) failed QA. Returned to supplier.`,
          recipientRole: 'Warehouse',
          entityType: 'QUALITY_INSPECTION',
          entityId: savedQa.id
        });
      }
    } else if (workOrder) {
      // Flow: Work Order QA
      if (dto.status === QAStatus.PASS) {
        workOrder.status = WorkOrderStatus.COMPLETED;
        await this.woRepo.save(workOrder);

        // Stock in the Finished Good
        const targetWhId = workOrder.product.warehouse?.id;
        if (targetWhId) {
          await this.inventoryService.stockIn(
            workOrder.product.id,
            targetWhId,
            workOrder.quantity,
            'WORK_ORDER_QA_PASS',
            workOrder.id,
            user
          );
        }
      } else {
        // Failed / Rework
        workOrder.status = WorkOrderStatus.COMPLETED; // Complete, but with defect logs
        await this.woRepo.save(workOrder);

        // Notify Production Manager
        await this.notificationsService.create({
          title: 'Production QA Defect Alert',
          message: `Work Order ${workOrder.code} (${workOrder.product.name}) failed quality checks. Status: ${dto.status}.`,
          recipientRole: 'Production',
          entityType: 'QUALITY_INSPECTION',
          entityId: savedQa.id
        });
      }
    }

    // Audit logs
    await this.auditService.log({
      action: 'QA_INSPECTION',
      entityName: 'QualityInspection',
      entityId: savedQa.id,
      afterState: { status: dto.status, code },
      userEmail: user.email
    });

    return savedQa;
  }
}
