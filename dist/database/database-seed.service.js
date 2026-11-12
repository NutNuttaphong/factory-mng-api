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
exports.DatabaseSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const rbac_entity_1 = require("./entities/rbac.entity");
const master_entity_1 = require("./entities/master.entity");
const workflow_audit_entity_1 = require("./entities/workflow-audit.entity");
const purchasing_inventory_entity_1 = require("./entities/purchasing-inventory.entity");
let DatabaseSeedService = class DatabaseSeedService {
    permRepo;
    roleRepo;
    userRepo;
    categoryRepo;
    unitRepo;
    supplierRepo;
    customerRepo;
    whRepo;
    locRepo;
    productRepo;
    bomRepo;
    bomItemRepo;
    wfRepo;
    stepRepo;
    stockRepo;
    constructor(permRepo, roleRepo, userRepo, categoryRepo, unitRepo, supplierRepo, customerRepo, whRepo, locRepo, productRepo, bomRepo, bomItemRepo, wfRepo, stepRepo, stockRepo) {
        this.permRepo = permRepo;
        this.roleRepo = roleRepo;
        this.userRepo = userRepo;
        this.categoryRepo = categoryRepo;
        this.unitRepo = unitRepo;
        this.supplierRepo = supplierRepo;
        this.customerRepo = customerRepo;
        this.whRepo = whRepo;
        this.locRepo = locRepo;
        this.productRepo = productRepo;
        this.bomRepo = bomRepo;
        this.bomItemRepo = bomItemRepo;
        this.wfRepo = wfRepo;
        this.stepRepo = stepRepo;
        this.stockRepo = stockRepo;
    }
    async onApplicationBootstrap() {
        await this.seedPermissions();
        const roles = await this.seedRoles();
        await this.seedUsers(roles);
        await this.seedMasterData();
        await this.seedApprovalWorkflows(roles);
    }
    async seedPermissions() {
        const permissions = [
            { code: 'USER_VIEW', description: 'View user list' },
            { code: 'USER_CREATE', description: 'Create user' },
            { code: 'USER_UPDATE', description: 'Update user' },
            { code: 'USER_DELETE', description: 'Delete user' },
            { code: 'PRODUCT_VIEW', description: 'View product details' },
            { code: 'PRODUCT_CREATE', description: 'Create new products' },
            { code: 'PRODUCT_UPDATE', description: 'Update product properties' },
            { code: 'PURCHASE_CREATE', description: 'Create purchase request or order' },
            { code: 'PURCHASE_APPROVE', description: 'Approve purchase workflows' },
            { code: 'STOCK_VIEW', description: 'View stock levels' },
            { code: 'STOCK_ADJUST', description: 'Perform manual stock adjustments' },
            { code: 'PRODUCTION_CREATE', description: 'Create production plan and work orders' },
            { code: 'PRODUCTION_APPROVE', description: 'Approve production workflows' },
            { code: 'REPORT_VIEW', description: 'Access report analytics' },
        ];
        for (const p of permissions) {
            const exists = await this.permRepo.findOneBy({ code: p.code });
            if (!exists) {
                await this.permRepo.save(this.permRepo.create(p));
            }
        }
    }
    async seedRoles() {
        const rolePermissionsMap = {
            'Super Admin': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PURCHASE_CREATE', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'STOCK_ADJUST', 'PRODUCTION_CREATE', 'PRODUCTION_APPROVE', 'REPORT_VIEW'],
            'Admin': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'STOCK_VIEW'],
            'Manager': ['PRODUCT_VIEW', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'PRODUCTION_APPROVE', 'REPORT_VIEW'],
            'Purchasing': ['PRODUCT_VIEW', 'PURCHASE_CREATE', 'STOCK_VIEW'],
            'Warehouse': ['PRODUCT_VIEW', 'STOCK_VIEW', 'STOCK_ADJUST'],
            'Production': ['PRODUCT_VIEW', 'STOCK_VIEW', 'PRODUCTION_CREATE'],
            'QA': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
            'Sales': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
            'Finance': ['PRODUCT_VIEW', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'REPORT_VIEW'],
            'Viewer': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
        };
        const roles = {};
        for (const [roleName, codes] of Object.entries(rolePermissionsMap)) {
            let role = await this.roleRepo.findOne({ where: { name: roleName }, relations: { permissions: true } });
            if (!role) {
                role = this.roleRepo.create({ name: roleName, description: `${roleName} Role` });
            }
            const dbPermissions = [];
            for (const code of codes) {
                const perm = await this.permRepo.findOneBy({ code });
                if (perm)
                    dbPermissions.push(perm);
            }
            role.permissions = dbPermissions;
            roles[roleName] = await this.roleRepo.save(role);
        }
        return roles;
    }
    async seedUsers(roles) {
        const userSeed = [
            { email: 'superadmin@factory.com', name: 'Nuttaphong SuperAdmin', role: 'Super Admin' },
            { email: 'admin@factory.com', name: 'Somsak Admin', role: 'Admin' },
            { email: 'manager@factory.com', name: 'Wichai Manager', role: 'Manager' },
            { email: 'purchasing@factory.com', name: 'Jane Purchasing', role: 'Purchasing' },
            { email: 'warehouse@factory.com', name: 'Somchai Warehouse', role: 'Warehouse' },
            { email: 'production@factory.com', name: 'Kitti Production', role: 'Production' },
            { email: 'qa@factory.com', name: 'Sunee QA', role: 'QA' },
            { email: 'sales@factory.com', name: 'Anan Sales', role: 'Sales' },
            { email: 'finance@factory.com', name: 'Malee Finance', role: 'Finance' },
            { email: 'viewer@factory.com', name: 'Sopa Viewer', role: 'Viewer' },
        ];
        const passwordHash = await bcrypt.hash('FactoryMng2026!', 10);
        for (const u of userSeed) {
            const exists = await this.userRepo.findOneBy({ email: u.email });
            if (!exists) {
                const newUser = this.userRepo.create({
                    email: u.email,
                    fullName: u.name,
                    passwordHash,
                    roles: [roles[u.role]]
                });
                await this.userRepo.save(newUser);
            }
        }
    }
    async seedMasterData() {
        const categories = ['Raw Materials', 'Packaging', 'Semi Finished Goods', 'Finished Goods'];
        const dbCategories = {};
        for (const catName of categories) {
            let cat = await this.categoryRepo.findOneBy({ name: catName });
            if (!cat) {
                cat = await this.categoryRepo.save(this.categoryRepo.create({ name: catName }));
            }
            dbCategories[catName] = cat;
        }
        const units = ['KG', 'PCS', 'SET', 'LITER'];
        const dbUnits = {};
        for (const unitName of units) {
            let unit = await this.unitRepo.findOneBy({ name: unitName });
            if (!unit) {
                unit = await this.unitRepo.save(this.unitRepo.create({ name: unitName }));
            }
            dbUnits[unitName] = unit;
        }
        let supplier = await this.supplierRepo.findOneBy({ name: 'ABC Manufacturing' });
        if (!supplier) {
            supplier = await this.supplierRepo.save(this.supplierRepo.create({
                name: 'ABC Manufacturing',
                contactName: 'John Supplier',
                email: 'john@abcmfg.com',
                phone: '0812345678',
                address: '789 Industry Rd, Bangkok'
            }));
        }
        let customer = await this.customerRepo.findOneBy({ name: 'Industrial Partner Corp' });
        if (!customer) {
            customer = await this.customerRepo.save(this.customerRepo.create({
                name: 'Industrial Partner Corp',
                contactName: 'Sarah Customer',
                email: 'sarah@industrial.com',
                phone: '0898765432',
                address: '456 Commercial Blvd, Chonburi'
            }));
        }
        const warehouses = [
            { code: 'WH-A', name: 'Main Warehouse', locations: ['Row-1', 'Row-2'] },
            { code: 'WH-B', name: 'Secondary Warehouse', locations: ['Row-1'] },
        ];
        const dbWarehouses = {};
        for (const wh of warehouses) {
            let dbWh = await this.whRepo.findOneBy({ code: wh.code });
            if (!dbWh) {
                dbWh = await this.whRepo.save(this.whRepo.create({ code: wh.code, name: wh.name }));
                for (const loc of wh.locations) {
                    await this.locRepo.save(this.locRepo.create({ code: loc, warehouse: dbWh }));
                }
            }
            dbWarehouses[wh.code] = dbWh;
        }
        const productsSeed = [
            { code: 'RM-STEEL', name: 'Steel Sheet', cat: 'Raw Materials', unit: 'KG', type: master_entity_1.ProductType.RAW_MATERIAL, cost: 500, price: 0, minStock: 200, wh: 'WH-A', initQty: 850 },
            { code: 'RM-PLASTIC', name: 'Granular Plastic', cat: 'Raw Materials', unit: 'KG', type: master_entity_1.ProductType.RAW_MATERIAL, cost: 100, price: 0, minStock: 300, wh: 'WH-A', initQty: 120 },
            { code: 'RM-BOLT', name: 'Steel Bolt M8', cat: 'Raw Materials', unit: 'PCS', type: master_entity_1.ProductType.RAW_MATERIAL, cost: 5, price: 0, minStock: 1000, wh: 'WH-A', initQty: 5000 },
            { code: 'PK-BOX', name: 'Cardboard Box Standard', cat: 'Packaging', unit: 'SET', type: master_entity_1.ProductType.PACKAGING, cost: 20, price: 0, minStock: 500, wh: 'WH-A', initQty: 1000 },
            { code: 'FG-PRODUCT-A', name: 'Finished Machine A', cat: 'Finished Goods', unit: 'PCS', type: master_entity_1.ProductType.FINISHED_GOOD, cost: 1500, price: 2500, minStock: 50, wh: 'WH-B', initQty: 75 },
        ];
        const dbProducts = {};
        for (const p of productsSeed) {
            let dbProd = await this.productRepo.findOneBy({ code: p.code });
            if (!dbProd) {
                dbProd = await this.productRepo.save(this.productRepo.create({
                    code: p.code,
                    name: p.name,
                    category: dbCategories[p.cat],
                    unit: dbUnits[p.unit],
                    type: p.type,
                    cost: p.cost,
                    price: p.price,
                    minimumStock: p.minStock,
                    maximumStock: 100000,
                    warehouse: dbWarehouses[p.wh],
                    status: 'ACTIVE'
                }));
                const status = p.initQty === 0 ? 'OUT' : p.initQty < p.minStock ? 'LOW' : 'NORMAL';
                await this.stockRepo.save(this.stockRepo.create({
                    product: dbProd,
                    warehouse: dbWarehouses[p.wh],
                    quantity: p.initQty,
                    status
                }));
            }
            dbProducts[p.code] = dbProd;
        }
        let bom = await this.bomRepo.findOne({ where: { product: { id: dbProducts['FG-PRODUCT-A'].id } } });
        if (!bom) {
            bom = await this.bomRepo.save(this.bomRepo.create({
                code: 'BOM-PRODUCT-A',
                product: dbProducts['FG-PRODUCT-A'],
                description: 'Standard BOM for Finished Machine A'
            }));
            const items = [
                { product: dbProducts['RM-STEEL'], qty: 2.0 },
                { product: dbProducts['RM-PLASTIC'], qty: 1.0 },
                { product: dbProducts['RM-BOLT'], qty: 4.0 },
                { product: dbProducts['PK-BOX'], qty: 1.0 },
            ];
            for (const item of items) {
                await this.bomItemRepo.save(this.bomItemRepo.create({
                    bom,
                    product: item.product,
                    quantityNeeded: item.qty
                }));
            }
        }
    }
    async seedApprovalWorkflows(roles) {
        const defaultWorkflows = [
            { targetType: 'PURCHASE_REQUEST', minAmount: 0, maxAmount: 9999, steps: ['Manager'] },
            { targetType: 'PURCHASE_REQUEST', minAmount: 10000, maxAmount: 99999, steps: ['Manager', 'Finance'] },
            { targetType: 'PURCHASE_REQUEST', minAmount: 100000, maxAmount: 99999999, steps: ['Manager', 'Super Admin', 'Finance'] },
        ];
        for (const dwf of defaultWorkflows) {
            const exists = await this.wfRepo.findOneBy({
                targetType: dwf.targetType,
                minAmount: dwf.minAmount,
                maxAmount: dwf.maxAmount
            });
            if (!exists) {
                const wf = await this.wfRepo.save(this.wfRepo.create({
                    targetType: dwf.targetType,
                    minAmount: dwf.minAmount,
                    maxAmount: dwf.maxAmount,
                    isActive: true
                }));
                for (let i = 0; i < dwf.steps.length; i++) {
                    const roleName = dwf.steps[i];
                    const role = roles[roleName];
                    if (role) {
                        await this.stepRepo.save(this.stepRepo.create({
                            workflow: wf,
                            stepOrder: i + 1,
                            role
                        }));
                    }
                }
            }
        }
    }
};
exports.DatabaseSeedService = DatabaseSeedService;
exports.DatabaseSeedService = DatabaseSeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rbac_entity_1.Permission)),
    __param(1, (0, typeorm_1.InjectRepository)(rbac_entity_1.Role)),
    __param(2, (0, typeorm_1.InjectRepository)(rbac_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(master_entity_1.Category)),
    __param(4, (0, typeorm_1.InjectRepository)(master_entity_1.Unit)),
    __param(5, (0, typeorm_1.InjectRepository)(master_entity_1.Supplier)),
    __param(6, (0, typeorm_1.InjectRepository)(master_entity_1.Customer)),
    __param(7, (0, typeorm_1.InjectRepository)(master_entity_1.Warehouse)),
    __param(8, (0, typeorm_1.InjectRepository)(master_entity_1.WarehouseLocation)),
    __param(9, (0, typeorm_1.InjectRepository)(master_entity_1.Product)),
    __param(10, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.BOM)),
    __param(11, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.BOMItem)),
    __param(12, (0, typeorm_1.InjectRepository)(workflow_audit_entity_1.ApprovalWorkflow)),
    __param(13, (0, typeorm_1.InjectRepository)(workflow_audit_entity_1.ApprovalStep)),
    __param(14, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.Stock)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], DatabaseSeedService);
//# sourceMappingURL=database-seed.service.js.map