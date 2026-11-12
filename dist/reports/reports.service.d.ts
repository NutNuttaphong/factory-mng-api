import { Repository } from 'typeorm';
import { SalesOrder, PurchaseOrder, WorkOrder, Stock, QualityInspection, AuditLog } from '../database/entities';
export declare class ReportsService {
    private soRepo;
    private poRepo;
    private woRepo;
    private stockRepo;
    private qaRepo;
    private auditRepo;
    constructor(soRepo: Repository<SalesOrder>, poRepo: Repository<PurchaseOrder>, woRepo: Repository<WorkOrder>, stockRepo: Repository<Stock>, qaRepo: Repository<QualityInspection>, auditRepo: Repository<AuditLog>);
    getDashboardData(): Promise<{
        kpis: {
            totalSales: number;
            totalPurchasing: number;
            netMargin: number;
            activeWOs: number;
            lowStockItems: number;
            qaPassRate: number;
        };
        salesAndCostsChart: {
            month: string;
            sales: number;
            costs: number;
        }[];
        productionBreakdown: {
            draft: number;
            pendingMaterial: number;
            materialIssued: number;
            inProduction: number;
            pendingQA: number;
            completed: number;
        };
        recentLogs: {
            id: string;
            userEmail: string;
            action: string;
            entityName: string;
            createdAt: Date;
        }[];
    }>;
}
