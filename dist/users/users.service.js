"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const entities_1 = require("../database/entities");
let UsersService = class UsersService {
    userRepo;
    roleRepo;
    permRepo;
    constructor(userRepo, roleRepo, permRepo) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.permRepo = permRepo;
    }
    async findAll() {
        return this.userRepo.find({
            relations: { roles: true },
            order: { fullName: 'ASC' }
        });
    }
    async findOne(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: { roles: { permissions: true } }
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async create(dto) {
        const exists = await this.userRepo.findOneBy({ email: dto.email });
        if (exists)
            throw new common_1.BadRequestException('Email already in use');
        const password = dto.password || 'FactoryMng2026!';
        const passwordHash = await bcrypt.hash(password, 10);
        const userRoles = [];
        for (const name of dto.roleNames) {
            const role = await this.roleRepo.findOneBy({ name });
            if (role)
                userRoles.push(role);
        }
        const user = this.userRepo.create({
            email: dto.email,
            fullName: dto.fullName,
            passwordHash,
            roles: userRoles,
            isActive: true
        });
        return this.userRepo.save(user);
    }
    async update(id, dto) {
        const user = await this.findOne(id);
        if (dto.email && dto.email !== user.email) {
            const exists = await this.userRepo.findOneBy({ email: dto.email });
            if (exists)
                throw new common_1.BadRequestException('Email already in use');
            user.email = dto.email;
        }
        if (dto.fullName)
            user.fullName = dto.fullName;
        if (dto.isActive !== undefined)
            user.isActive = dto.isActive;
        if (dto.password) {
            user.passwordHash = await bcrypt.hash(dto.password, 10);
        }
        if (dto.roleNames) {
            const userRoles = [];
            for (const name of dto.roleNames) {
                const role = await this.roleRepo.findOneBy({ name });
                if (role)
                    userRoles.push(role);
            }
            user.roles = userRoles;
        }
        return this.userRepo.save(user);
    }
    async remove(id) {
        const user = await this.findOne(id);
        return this.userRepo.remove(user);
    }
    async getRoles() {
        return this.roleRepo.find({ relations: { permissions: true } });
    }
    async getPermissions() {
        return this.permRepo.find();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Role)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Permission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map