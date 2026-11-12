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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
let NotificationsService = class NotificationsService {
    notificationRepo;
    constructor(notificationRepo) {
        this.notificationRepo = notificationRepo;
    }
    async create(params) {
        const notification = this.notificationRepo.create({
            title: params.title,
            message: params.message,
            recipientRole: params.recipientRole,
            recipientId: params.recipientId,
            entityType: params.entityType,
            entityId: params.entityId,
            isRead: false
        });
        return this.notificationRepo.save(notification);
    }
    async findForUser(user) {
        const roles = user.roles.map((r) => r.name);
        return this.notificationRepo.find({
            where: [
                { recipientId: user.id },
                { recipientRole: (0, typeorm_2.In)(roles) },
                { recipientId: (0, typeorm_2.IsNull)(), recipientRole: (0, typeorm_2.IsNull)() }
            ],
            order: { createdAt: 'DESC' }
        });
    }
    async markRead(id) {
        const notification = await this.notificationRepo.findOneBy({ id });
        if (!notification)
            throw new common_1.NotFoundException('Notification not found');
        notification.isRead = true;
        return this.notificationRepo.save(notification);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map