"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
let ReportsService = class ReportsService {
    soRepo;
    poRepo;
    woRepo;
    stockRepo;
    qaRepo;
    auditRepo;
    constructor(soRepo, poRepo, woRepo, stockRepo, qaRepo, auditRepo) {
        this.soRepo = soRepo;
        this.poRepo = poRepo;
        this.woRepo = woRepo;
        this.stockRepo = stockRepo;
        this.qaRepo = qaRepo;
        this.auditRepo = auditRepo;
    }
    async getDashboardData() {
        const totalSalesList = await this.soRepo.find({
            where: { status: entities_1.SalesOrderStatus.DELIVERED }
        });
        const totalSales = totalSalesList.reduce((sum, item) => sum + Number(item.totalAmount), 0);
        const totalPurchasingList = await this.poRepo.find({
            where: { status: entities_1.ApprovalStatus.APPROVED }
        });
        const totalPurchasing = totalPurchasingList.reduce((sum, item) => sum + Number(item.totalAmount), 0);
        const activeWOs = await this.woRepo.countBy({
            status: entities_1.WorkOrderStatus.IN_PRODUCTION
        });
        const lowStockItems = await this.stockRepo.countBy([
            { status: 'LOW' },
            { status: 'OUT' }
        ]);
        const qaInspections = await this.qaRepo.find();
        const passedCount = qaInspections.filter((ins) => ins.status === entities_1.QAStatus.PASS).length;
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
        const draftWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.DRAFT });
        const pendingMatWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.PENDING_MATERIAL });
        const issuedWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.MATERIAL_ISSUED });
        const inProdWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.IN_PRODUCTION });
        const pendingQaWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.PENDING_QA });
        const completedWOs = await this.woRepo.countBy({ status: entities_1.WorkOrderStatus.COMPLETED });
        const productionBreakdown = {
            draft: draftWOs,
            pendingMaterial: pendingMatWOs,
            materialIssued: issuedWOs,
            inProduction: inProdWOs,
            pendingQA: pendingQaWOs,
            completed: completedWOs
        };
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.SalesOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.PurchaseOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.WorkOrder)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Stock)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.QualityInspection)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map