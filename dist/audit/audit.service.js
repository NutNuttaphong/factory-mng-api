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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const workflow_audit_entity_1 = require("../database/entities/workflow-audit.entity");
let AuditService = class AuditService {
    auditRepo;
    constructor(auditRepo) {
        this.auditRepo = auditRepo;
    }
    async log(params) {
        const beforeStr = params.beforeState ? JSON.stringify(params.beforeState) : null;
        const afterStr = params.afterState ? JSON.stringify(params.afterState) : null;
        const logEntry = this.auditRepo.create({
            action: params.action,
            entityName: params.entityName,
            entityId: params.entityId,
            beforeState: beforeStr,
            afterState: afterStr,
            userEmail: params.userEmail,
            ipAddress: params.ipAddress || '127.0.0.1'
        });
        return this.auditRepo.save(logEntry);
    }
    async findAll() {
        return this.auditRepo.find({
            order: { createdAt: 'DESC' }
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(workflow_audit_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map