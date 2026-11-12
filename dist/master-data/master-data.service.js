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
exports.MasterDataService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const master_entity_1 = require("../database/entities/master.entity");
const purchasing_inventory_entity_1 = require("../database/entities/purchasing-inventory.entity");
let MasterDataService = class MasterDataService {
    productRepo;
    categoryRepo;
    unitRepo;
    supplierRepo;
    customerRepo;
    whRepo;
    locRepo;
    stockRepo;
    constructor(productRepo, categoryRepo, unitRepo, supplierRepo, customerRepo, whRepo, locRepo, stockRepo) {
        this.productRepo = productRepo;
        this.categoryRepo = categoryRepo;
        this.unitRepo = unitRepo;
        this.supplierRepo = supplierRepo;
        this.customerRepo = customerRepo;
        this.whRepo = whRepo;
        this.locRepo = locRepo;
        this.stockRepo = stockRepo;
    }
    async findProducts() {
        return this.productRepo.find({
            relations: { category: true, unit: true, warehouse: true },
            order: { code: 'ASC' }
        });
    }
    async findProduct(id) {
        const prod = await this.productRepo.findOne({
            where: { id },
            relations: { category: true, unit: true, warehouse: true }
        });
        if (!prod)
            throw new common_1.NotFoundException('Product not found');
        return prod;
    }
    async createProduct(dto) {
        const exists = await this.productRepo.findOneBy({ code: dto.code });
        if (exists)
            throw new common_1.BadRequestException('Product code already exists');
        const cat = await this.categoryRepo.findOneBy({ id: dto.categoryId });
        const unit = await this.unitRepo.findOneBy({ id: dto.unitId });
        const warehouse = dto.warehouseId ? await this.whRepo.findOneBy({ id: dto.warehouseId }) : null;
        const prod = this.productRepo.create({
            code: dto.code,
            name: dto.name,
            category: cat,
            type: dto.type,
            unit: unit,
            cost: Number(dto.cost),
            price: Number(dto.price),
            minimumStock: Number(dto.minimumStock),
            maximumStock: Number(dto.maximumStock),
            warehouse: warehouse,
            status: 'ACTIVE'
        });
        const savedProduct = await this.productRepo.save(prod);
        if (warehouse) {
            const stockExists = await this.stockRepo.findOne({
                where: { product: { id: savedProduct.id }, warehouse: { id: warehouse.id } }
            });
            if (!stockExists) {
                await this.stockRepo.save(this.stockRepo.create({
                    product: savedProduct,
                    warehouse: warehouse,
                    quantity: 0,
                    status: 'OUT'
                }));
            }
        }
        return savedProduct;
    }
    async updateProduct(id, dto) {
        const prod = await this.findProduct(id);
        if (dto.name)
            prod.name = dto.name;
        if (dto.type)
            prod.type = dto.type;
        if (dto.status)
            prod.status = dto.status;
        if (dto.cost !== undefined)
            prod.cost = Number(dto.cost);
        if (dto.price !== undefined)
            prod.price = Number(dto.price);
        if (dto.minimumStock !== undefined)
            prod.minimumStock = Number(dto.minimumStock);
        if (dto.maximumStock !== undefined)
            prod.maximumStock = Number(dto.maximumStock);
        if (dto.categoryId) {
            prod.category = (await this.categoryRepo.findOneBy({ id: dto.categoryId }));
        }
        if (dto.unitId) {
            prod.unit = (await this.unitRepo.findOneBy({ id: dto.unitId }));
        }
        if (dto.warehouseId) {
            const newWh = await this.whRepo.findOneBy({ id: dto.warehouseId });
            prod.warehouse = newWh;
            if (newWh) {
                const stockExists = await this.stockRepo.findOne({
                    where: { product: { id: prod.id }, warehouse: { id: newWh.id } }
                });
                if (!stockExists) {
                    await this.stockRepo.save(this.stockRepo.create({
                        product: prod,
                        warehouse: newWh,
                        quantity: 0,
                        status: 'OUT'
                    }));
                }
            }
        }
        return this.productRepo.save(prod);
    }
    async deleteProduct(id) {
        const prod = await this.findProduct(id);
        return this.productRepo.remove(prod);
    }
    async findCategories() { return this.categoryRepo.find({ order: { name: 'ASC' } }); }
    async createCategory(name, description) {
        return this.categoryRepo.save(this.categoryRepo.create({ name, description }));
    }
    async findUnits() { return this.unitRepo.find({ order: { name: 'ASC' } }); }
    async createUnit(name) {
        return this.unitRepo.save(this.unitRepo.create({ name }));
    }
    async findSuppliers() { return this.supplierRepo.find({ order: { name: 'ASC' } }); }
    async createSupplier(dto) { return this.supplierRepo.save(this.supplierRepo.create(dto)); }
    async updateSupplier(id, dto) {
        const supplier = await this.supplierRepo.findOneBy({ id });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        Object.assign(supplier, dto);
        return this.supplierRepo.save(supplier);
    }
    async findCustomers() { return this.customerRepo.find({ order: { name: 'ASC' } }); }
    async createCustomer(dto) { return this.customerRepo.save(this.customerRepo.create(dto)); }
    async updateCustomer(id, dto) {
        const customer = await this.customerRepo.findOneBy({ id });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found');
        Object.assign(customer, dto);
        return this.customerRepo.save(customer);
    }
    async findWarehouses() {
        return this.whRepo.find({
            relations: { locations: true },
            order: { code: 'ASC' }
        });
    }
    async createWarehouse(dto) {
        const wh = await this.whRepo.save(this.whRepo.create({
            code: dto.code,
            name: dto.name,
            location: dto.location
        }));
        if (dto.locations) {
            for (const locCode of dto.locations) {
                await this.locRepo.save(this.locRepo.create({ code: locCode, warehouse: wh }));
            }
        }
        return this.findWarehouses();
    }
};
exports.MasterDataService = MasterDataService;
exports.MasterDataService = MasterDataService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(master_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(master_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(master_entity_1.Unit)),
    __param(3, (0, typeorm_1.InjectRepository)(master_entity_1.Supplier)),
    __param(4, (0, typeorm_1.InjectRepository)(master_entity_1.Customer)),
    __param(5, (0, typeorm_1.InjectRepository)(master_entity_1.Warehouse)),
    __param(6, (0, typeorm_1.InjectRepository)(master_entity_1.WarehouseLocation)),
    __param(7, (0, typeorm_1.InjectRepository)(purchasing_inventory_entity_1.Stock)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], MasterDataService);
//# sourceMappingURL=master-data.service.js.map