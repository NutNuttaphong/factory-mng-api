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
exports.MasterDataController = void 0;
const common_1 = require("@nestjs/common");
const master_data_service_1 = require("./master-data.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
let MasterDataController = class MasterDataController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getProducts() {
        return this.service.findProducts();
    }
    async getProduct(id) {
        return this.service.findProduct(id);
    }
    async createProduct(dto) {
        return this.service.createProduct(dto);
    }
    async updateProduct(id, dto) {
        return this.service.updateProduct(id, dto);
    }
    async deleteProduct(id) {
        return this.service.deleteProduct(id);
    }
    async getCategories() {
        return this.service.findCategories();
    }
    async createCategory(body) {
        return this.service.createCategory(body.name, body.description);
    }
    async getUnits() {
        return this.service.findUnits();
    }
    async createUnit(body) {
        return this.service.createUnit(body.name);
    }
    async getSuppliers() {
        return this.service.findSuppliers();
    }
    async createSupplier(dto) {
        return this.service.createSupplier(dto);
    }
    async updateSupplier(id, dto) {
        return this.service.updateSupplier(id, dto);
    }
    async getCustomers() {
        return this.service.findCustomers();
    }
    async createCustomer(dto) {
        return this.service.createCustomer(dto);
    }
    async updateCustomer(id, dto) {
        return this.service.updateCustomer(id, dto);
    }
    async getWarehouses() {
        return this.service.findWarehouses();
    }
    async createWarehouse(dto) {
        return this.service.createWarehouse(dto);
    }
};
exports.MasterDataController = MasterDataController;
__decorate([
    (0, common_1.Get)('products'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_VIEW'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Post)('products'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_CREATE'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_UPDATE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, permissions_decorator_1.RequirePermissions)('PRODUCT_UPDATE'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('units'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getUnits", null);
__decorate([
    (0, common_1.Post)('units'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createUnit", null);
__decorate([
    (0, common_1.Get)('suppliers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Patch)('suppliers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "updateSupplier", null);
__decorate([
    (0, common_1.Get)('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_VIEW'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "getWarehouses", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    (0, permissions_decorator_1.RequirePermissions)('STOCK_ADJUST'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterDataController.prototype, "createWarehouse", null);
exports.MasterDataController = MasterDataController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [master_data_service_1.MasterDataService])
], MasterDataController);
//# sourceMappingURL=master-data.controller.js.map