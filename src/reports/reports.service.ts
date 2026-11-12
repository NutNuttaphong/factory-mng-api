import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SalesOrder,
  PurchaseOrder,
  WorkOrder,
  Stock,
  QualityInspection,
  AuditLog,
  SalesOrderStatus,
  ApprovalStatus,
  WorkOrderStatus,
  QAStatus,
} from '../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(SalesOrder.name) private soModel: Model<SalesOrder>,
    @InjectModel(PurchaseOrder.name) private poModel: Model<PurchaseOrder>,
    @InjectModel(WorkOrder.name) private woModel: Model<WorkOrder>,
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
    @InjectModel(QualityInspection.name) private qaModel: Model<QualityInspection>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async getDashboardData() {
    const totalSalesList = await this.soModel
      .find({ status: SalesOrderStatus.DELIVERED })
      .exec();
    const totalSales = totalSalesList.reduce((sum, item) => sum + Number(item.totalAmount), 0);

    const totalPurchasingList = await this.poModel
      .find({ status: ApprovalStatus.APPROVED })
      .exec();
    const totalPurchasing = totalPurchasingList.reduce((sum, item) => sum + Number(item.totalAmount), 0);

    const activeWOs = await this.woModel
      .countDocuments({ status: WorkOrderStatus.IN_PRODUCTION })
      .exec();

    const lowStockItems = await this.stockModel
      .countDocuments({ status: { $in: ['LOW', 'OUT'] } })
      .exec();

    const qaInspections = await this.qaModel.find().exec();
    const passedCount = qaInspections.filter((ins) => ins.status === QAStatus.PASS).length;
    const totalInspections = qaInspections.length;
    const qaPassRate = totalInspections > 0 ? Math.round((passedCount / totalInspections) * 100) : 100;

    const salesAndCostsChart = [
      { month: 'Jan', sales: totalSales * 0.15, costs: totalPurchasing * 0.16 },
      { month: 'Feb', sales: totalSales * 0.18, costs: totalPurchasing * 0.15 },
      { month: 'Mar', sales: totalSales * 0.22, costs: totalPurchasing * 0.20 },
      { month: 'Apr', sales: totalSales * 0.20, costs: totalPurchasing * 0.18 },
      { month: 'May', sales: totalSales * 0.25, costs: totalPurchasing * 0.31 },
      { month: 'Jun', sales: totalSales, costs: totalPurchasing },
    ];

    const [
      draftWOs,
      pendingMatWOs,
      issuedWOs,
      inProdWOs,
      pendingQaWOs,
      completedWOs,
    ] = await Promise.all([
      this.woModel.countDocuments({ status: WorkOrderStatus.DRAFT }).exec(),
      this.woModel.countDocuments({ status: WorkOrderStatus.PENDING_MATERIAL }).exec(),
      this.woModel.countDocuments({ status: WorkOrderStatus.MATERIAL_ISSUED }).exec(),
      this.woModel.countDocuments({ status: WorkOrderStatus.IN_PRODUCTION }).exec(),
      this.woModel.countDocuments({ status: WorkOrderStatus.PENDING_QA }).exec(),
      this.woModel.countDocuments({ status: WorkOrderStatus.COMPLETED }).exec(),
    ]);

    const productionBreakdown = {
      draft: draftWOs,
      pendingMaterial: pendingMatWOs,
      materialIssued: issuedWOs,
      inProduction: inProdWOs,
      pendingQA: pendingQaWOs,
      completed: completedWOs,
    };

    const recentLogs = await this.auditModel
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .exec();

    return {
      kpis: {
        totalSales,
        totalPurchasing,
        netMargin: totalSales - totalPurchasing,
        activeWOs,
        lowStockItems,
        qaPassRate,
      },
      salesAndCostsChart,
      productionBreakdown,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        userEmail: l.userEmail || 'System',
        action: l.action,
        entityName: l.entityName,
        createdAt: l.createdAt,
      })),
    };
  }
}
