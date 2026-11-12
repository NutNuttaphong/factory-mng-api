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
exports.QualityController = void 0;
const common_1 = require("@nestjs/common");
const quality_service_1 = require("./quality.service");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const entities_1 = require("../database/entities");
let QualityController = class QualityController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getInspections() {
        return this.service.findInspections();
    }
    async getDefects() {
        return this.service.getDefects();
    }
    async createInspection(user, dto) {
        return this.service.createInspection(user, dto);
    }
};
exports.QualityController = QualityController;
__decorate([
    (0, common_1.Get)('inspections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QualityController.prototype, "getInspections", null);
__decorate([
    (0, common_1.Get)('defects'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QualityController.prototype, "getDefects", null);
__decorate([
    (0, common_1.Post)('inspections'),
    (0, permissions_decorator_1.RequirePermissions)('REPORT_VIEW'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entities_1.User, Object]),
    __metadata("design:returntype", Promise)
], QualityController.prototype, "createInspection", null);
exports.QualityController = QualityController = __decorate([
    (0, common_1.Controller)('quality'),
    __metadata("design:paramtypes", [quality_service_1.QualityService])
], QualityController);
//# sourceMappingURL=quality.controller.js.map