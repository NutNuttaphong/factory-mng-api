import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QualityInspection,
  QualityDefect,
  QAStatus,
  WorkOrder,
  WorkOrderStatus,
  GoodsReceipt,
  GoodsReceiptStatus,
  Product,
  User,
  isValidObjectId,
  refId,
} from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QualityService {
  constructor(
    @InjectModel(QualityInspection.name) private qaModel: Model<QualityInspection>,
    @InjectModel(QualityDefect.name) private defectModel: Model<QualityDefect>,
    @InjectModel(WorkOrder.name) private woModel: Model<WorkOrder>,
    @InjectModel(GoodsReceipt.name) private grModel: Model<GoodsReceipt>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async findInspections() {
    return this.qaModel
      .find()
      .populate(['product', 'workOrder', 'goodsReceipt', 'inspector'])
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDefects() {
    return this.defectModel
      .find()
      .populate({ path: 'inspection', populate: { path: 'product' } })
      .sort({ createdAt: -1 })
      .exec();
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
    },
  ) {
    if (!isValidObjectId(dto.productId)) {
      throw new NotFoundException('Product not found');
    }
    const product = await this.productModel.findById(dto.productId).populate('warehouse').exec();
    if (!product) throw new NotFoundException('Product not found');

    const qaCount = await this.qaModel.countDocuments().exec();
    const code = `QA-2026-${String(qaCount + 1).padStart(5, '0')}`;

    let workOrder: any = null;
    if (dto.workOrderId) {
      if (!isValidObjectId(dto.workOrderId)) {
        throw new NotFoundException('Work Order not found');
      }
      workOrder = await this.woModel
        .findById(dto.workOrderId)
        .populate({ path: 'product', populate: { path: 'warehouse' } })
        .exec();
      if (!workOrder) throw new NotFoundException('Work Order not found');
    }

    let goodsReceipt: any = null;
    if (dto.goodsReceiptId) {
      if (!isValidObjectId(dto.goodsReceiptId)) {
        throw new NotFoundException('Goods Receipt not found');
      }
      goodsReceipt = await this.grModel
        .findById(dto.goodsReceiptId)
        .populate([{ path: 'items.product', populate: { path: 'warehouse' } }, 'purchaseOrder'])
        .exec();
      if (!goodsReceipt) throw new NotFoundException('Goods Receipt not found');
    }

    const savedQa = await this.qaModel.create({
      code,
      product: product._id,
      workOrder: workOrder?._id ?? null,
      goodsReceipt: goodsReceipt?._id ?? null,
      batchNo: dto.batchNo ?? null,
      inspector: refId(user),
      weight: dto.weight !== undefined ? Number(dto.weight) : null,
      size: dto.size !== undefined ? Number(dto.size) : null,
      color: dto.color ?? null,
      temperature: dto.temperature !== undefined ? Number(dto.temperature) : null,
      defectDetails: dto.defectDetails ?? null,
      status: dto.status,
      comment: dto.comment ?? null,
    });

    if (dto.defectsList && dto.defectsList.length > 0) {
      for (const d of dto.defectsList) {
        await this.defectModel.create({
          inspection: savedQa._id,
          defectType: d.defectType,
          severity: d.severity,
          description: d.description ?? null,
        });
      }
    }

    if (goodsReceipt) {
      if (dto.status === QAStatus.PASS) {
        goodsReceipt.status = GoodsReceiptStatus.QA_PASSED;
        for (const item of goodsReceipt.items) {
          item.quantityAccepted = item.quantityReceived;
          item.quantityRejected = 0;

          const targetWhId = item.product?.warehouse?.id || product.warehouse?.id;
          if (targetWhId) {
            await this.inventoryService.stockIn(
              item.product.id,
              targetWhId,
              item.quantityReceived,
              'GOODS_RECEIPT_QA_PASS',
              goodsReceipt.id,
              user,
            );
          }
        }
        await goodsReceipt.save();
      } else {
        goodsReceipt.status = GoodsReceiptStatus.QA_FAILED;
        for (const item of goodsReceipt.items) {
          item.quantityAccepted = 0;
          item.quantityRejected = item.quantityReceived;
        }
        await goodsReceipt.save();

        await this.notificationsService.create({
          title: 'QA Inspection Failed',
          message: `Goods Receipt ${goodsReceipt.code} (PO: ${goodsReceipt.purchaseOrder?.code}) failed QA. Returned to supplier.`,
          recipientRole: 'Warehouse',
          entityType: 'QUALITY_INSPECTION',
          entityId: savedQa.id,
        });
      }
    } else if (workOrder) {
      if (dto.status === QAStatus.PASS) {
        workOrder.status = WorkOrderStatus.COMPLETED;
        await workOrder.save();

        const targetWhId = workOrder.product?.warehouse?.id;
        if (targetWhId) {
          await this.inventoryService.stockIn(
            workOrder.product.id,
            targetWhId,
            workOrder.quantity,
            'WORK_ORDER_QA_PASS',
            workOrder.id,
            user,
          );
        }
      } else {
        workOrder.status = WorkOrderStatus.COMPLETED;
        await workOrder.save();

        await this.notificationsService.create({
          title: 'Production QA Defect Alert',
          message: `Work Order ${workOrder.code} (${workOrder.product?.name}) failed quality checks. Status: ${dto.status}.`,
          recipientRole: 'Production',
          entityType: 'QUALITY_INSPECTION',
          entityId: savedQa.id,
        });
      }
    }

    await this.auditService.log({
      action: 'QA_INSPECTION',
      entityName: 'QualityInspection',
      entityId: savedQa.id,
      afterState: { status: dto.status, code },
      userEmail: user.email,
    });

    return this.qaModel
      .findById(savedQa.id)
      .populate(['product', 'workOrder', 'goodsReceipt', 'inspector'])
      .exec();
  }
}
