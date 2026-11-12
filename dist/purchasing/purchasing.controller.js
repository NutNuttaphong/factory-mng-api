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
exports.PurchasingController = void 0;
const common_1 = require("@nestjs/common");
const purchasing_service_1 = require("./purchasing.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const entities_1 = require("../database/entities");
let PurchasingController = class PurchasingController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getPRs() {
        return this.service.findPRs();
    }
    async getPR(id) {
        return this.service.findPR(id);
    }
    async createPR(user, body) {
        return this.service.createPR(user, body.items);
    }
    async submitPR(id, user) {
        return this.service.submitPR(id, user);
    }
    async approvePR(id, body, user) {
        return this.service.approvePR(id, body.comment || 'Approved', user);
    }
    async rejectPR(id, body, user) {
        return this.service.rejectPR(id, body.comment, user);
    }
    async getHistory(id) {
        return this.service.getApprovalHistory('PURCHASE_REQUEST', id);
    }
    async getPOs() {
        return this.service.findPOs();
    }
    async getPO(id) {
        return this.service.findPO(id);
    }
    async getGRs() {
        return this.service.findGRs();
    }
    async createGR(user, body) {
        return this.service.createGR(body.poId, user.id, body.items);
    }
};
exports.PurchasingController = PurchasingController;
__decorate([
    (0, common_1.Get)('requests'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getPRs", null);
__decorate([
    (0, common_1.Get)('requests/:id'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getPR", null);
__decorate([
    (0, common_1.Post)('requests'),
    (0, permissions_decorator_1.RequirePermissions)('PURCHASE_CREATE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "createPR", null);
__decorate([
    (0, common_1.Patch)('requests/:id/submit'),
    (0, permissions_decorator_1.RequirePermissions)('PURCHASE_CREATE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entities_1.User]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "submitPR", null);
__decorate([
    (0, common_1.Patch)('requests/:id/approve'),
    (0, permissions_decorator_1.RequirePermissions)('PURCHASE_APPROVE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, entities_1.User]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "approvePR", null);
__decorate([
    (0, common_1.Patch)('requests/:id/reject'),
    (0, permissions_decorator_1.RequirePermissions)('PURCHASE_APPROVE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, entities_1.User]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "rejectPR", null);
__decorate([
    (0, common_1.Get)('requests/:id/history'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getPOs", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getPO", null);
__decorate([
    (0, common_1.Get)('receipts'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "getGRs", null);
__decorate([
    (0, common_1.Post)('receipts'),
    (0, permissions_decorator_1.RequirePermissions)('PURCHASE_CREATE'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], PurchasingController.prototype, "createGR", null);
exports.PurchasingController = PurchasingController = __decorate([
    (0, common_1.Controller)('purchasing'),
    __metadata("design:paramtypes", [purchasing_service_1.PurchasingService])
], PurchasingController);
//# sourceMappingURL=purchasing.controller.js.map