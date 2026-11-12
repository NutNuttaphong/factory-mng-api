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
exports.ProductionController = void 0;
const common_1 = require("@nestjs/common");
const production_service_1 = require("./production.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const entities_1 = require("../database/entities");
let ProductionController = class ProductionController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getBOMs() {
        return this.service.findBOMs();
    }
    async createBOM(dto) {
        return this.service.createBOM(dto);
    }
    async getPlans() {
        return this.service.findPlans();
    }
    async createPlan(dto) {
        return this.service.createPlan(dto);
    }
    async getWorkOrders() {
        return this.service.findWorkOrders();
    }
    async createWorkOrder(dto) {
        return this.service.createWorkOrder(dto);
    }
    async getWorkOrder(id) {
        return this.service.findWorkOrder(id);
    }
    async checkRequirements(id) {
        return this.service.checkMaterialRequirement(id);
    }
    async issueMaterials(id, body, user) {
        return this.service.issueMaterials(id, body.warehouseId, user);
    }
    async startProduction(id) {
        return this.service.startProduction(id);
    }
    async reportResult(id, body, user) {
        return this.service.reportResult(id, body.qtyProduced, body.qtyDefective, body.notes || '', user);
    }
};
exports.ProductionController = ProductionController;
__decorate([
    (0, common_1.Get)('boms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getBOMs", null);
__decorate([
    (0, common_1.Post)('boms'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_CREATE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createBOM", null);
__decorate([
    (0, common_1.Get)('plans'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Post)('plans'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('orders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getWorkOrders", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createWorkOrder", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getWorkOrder", null);
__decorate([
    (0, common_1.Get)('orders/:id/requirements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "checkRequirements", null);
__decorate([
    (0, common_1.Post)('orders/:id/issue'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, entities_1.User]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "issueMaterials", null);
__decorate([
    (0, common_1.Patch)('orders/:id/start'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "startProduction", null);
__decorate([
    (0, common_1.Post)('orders/:id/result'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCTION_CREATE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, entities_1.User]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "reportResult", null);
exports.ProductionController = ProductionController = __decorate([
    (0, common_1.Controller)('production'),
    __metadata("design:paramtypes", [production_service_1.ProductionService])
], ProductionController);
//# sourceMappingURL=production.controller.js.map