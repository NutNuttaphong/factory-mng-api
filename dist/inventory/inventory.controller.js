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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const entities_1 = require("../database/entities");
let InventoryController = class InventoryController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getStocks() {
        return this.service.getStockOverview();
    }
    async getMovements() {
        return this.service.getMovements();
    }
    async stockIn(user, body) {
        return this.service.stockIn(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
    }
    async stockOut(user, body) {
        return this.service.stockOut(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
    }
    async transfer(user, body) {
        return this.service.transfer(body.productId, body.fromWarehouseId, body.toWarehouseId, body.quantity, user);
    }
    async adjust(user, body) {
        return this.service.adjust(body.productId, body.warehouseId, body.quantity, user);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('stocks'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStocks", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Post)('in'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_ADJUST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "stockIn", null);
__decorate([
    (0, common_1.Post)('out'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_ADJUST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "stockOut", null);
__decorate([
    (0, common_1.Post)('transfer'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_ADJUST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "transfer", null);
__decorate([
    (0, common_1.Post)('adjustment'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_ADJUST'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "adjust", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map