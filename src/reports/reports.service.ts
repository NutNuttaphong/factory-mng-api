import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  QAStatus
} from '../database/entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SalesOrder) private soRepo: Repository<SalesOrder>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    @InjectRepository(QualityInspection) private qaRepo: Repository<QualityInspection>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>
  ) {}

  async getDashboardData() {
    // 1. KPIs
    const totalSalesList = await this.soRepo.find({
      where: { status: SalesOrderStatus.DELIVERED }
    });
    const totalSales = totalSalesList.reduce((sum, item) => sum + Number(item.totalAmount), 0);

    const totalPurchasingList = await this.poRepo.find({
      where: { status: ApprovalStatus.APPROVED }
    });
    const totalPurchasing = totalPurchasingList.reduce((sum, item) => sum + Number(item.totalAmount), 0);

    const activeWOs = await this.woRepo.countBy({
      status: WorkOrderStatus.IN_PRODUCTION
    });

    const lowStockItems = await this.stockRepo.countBy([
      { status: 'LOW' },
      { status: 'OUT' }
    ]);

    // 2. QA Pass Rate
    const qaInspections = await this.qaRepo.find();
    const passedCount = qaInspections.filter((ins) => ins.status === QAStatus.PASS).length;
    const totalInspections = qaInspections.length;
    const qaPassRate = totalInspections > 0 ? Math.round((passedCount / totalInspections) * 100) : 100;

    // 3. Sales vs Costs breakdown (Mock monthly for chart compatibility)
    const salesAndCostsChart = [
      { month: 'Jan', sales: totalSales * 0.15, costs: totalPurchasing * 0.16 },
      { month: 'Feb', sales: totalSales * 0.18, costs: totalPurchasing * 0.15 },
      { month: 'Mar', sales: totalSales * 0.22, costs: totalPurchasing * 0.20 },
      { month: 'Apr', sales: totalSales * 0.20, costs: totalPurchasing * 0.18 },
      { month: 'May', sales: totalSales * 0.25, costs: totalPurchasing * 0.31 },
      { month: 'Jun', sales: totalSales, costs: totalPurchasing }, // Cumulative/Current
    ];

    // 4. Production Status Breakdown
    const draftWOs = await this.woRepo.countBy({ status: WorkOrderStatus.DRAFT });
    const pendingMatWOs = await this.woRepo.countBy({ status: WorkOrderStatus.PENDING_MATERIAL });
    const issuedWOs = await this.woRepo.countBy({ status: WorkOrderStatus.MATERIAL_ISSUED });
    const inProdWOs = await this.woRepo.countBy({ status: WorkOrderStatus.IN_PRODUCTION });
    const pendingQaWOs = await this.woRepo.countBy({ status: WorkOrderStatus.PENDING_QA });
    const completedWOs = await this.woRepo.countBy({ status: WorkOrderStatus.COMPLETED });

    const productionBreakdown = {
      draft: draftWOs,
      pendingMaterial: pendingMatWOs,
      materialIssued: issuedWOs,
      inProduction: inProdWOs,
      pendingQA: pendingQaWOs,
      completed: completedWOs
    };

    // 5. Recent audit logs
    const recentLogs = await this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 6
    });

    return {
      kpis: {
        totalSales,
        totalPurchasing,
        netMargin: totalSales - totalPurchasing,
        activeWOs,
        lowStockItems,
        qaPassRate
      },
      salesAndCostsChart,
      productionBreakdown,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        userEmail: l.userEmail || 'System',
        action: l.action,
        entityName: l.entityName,
        createdAt: l.createdAt
      }))
    };
  }
}
