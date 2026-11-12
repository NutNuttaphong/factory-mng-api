import { ReportsService } from './reports.service';
export declare class ReportsController {
    private service;
    constructor(service: ReportsService);
    getDashboard(): Promise<{
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
