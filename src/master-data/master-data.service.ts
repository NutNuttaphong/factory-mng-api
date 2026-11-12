import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Unit, Supplier, Customer, Warehouse, WarehouseLocation, Product, ProductType } from '../database/entities/master.entity';
import { Stock } from '../database/entities/purchasing-inventory.entity';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Warehouse) private whRepo: Repository<Warehouse>,
    @InjectRepository(WarehouseLocation) private locRepo: Repository<WarehouseLocation>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>
  ) {}

  // --- PRODUCTS ---

  async findProducts() {
    return this.productRepo.find({
      relations: { category: true, unit: true, warehouse: true },
      order: { code: 'ASC' }
    });
  }

  async findProduct(id: string) {
    const prod = await this.productRepo.findOne({
      where: { id },
      relations: { category: true, unit: true, warehouse: true }
    });
    if (!prod) throw new NotFoundException('Product not found');
    return prod;
  }

  async createProduct(dto: {
    code: string;
    name: string;
    categoryId: string;
    type: ProductType;
    unitId: string;
    cost: number;
    price: number;
    minimumStock: number;
    maximumStock: number;
    warehouseId?: string;
  }) {
    const exists = await this.productRepo.findOneBy({ code: dto.code });
    if (exists) throw new BadRequestException('Product code already exists');

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

    // Auto initialize stock record
    if (warehouse) {
      const stockExists = await this.stockRepo.findOne({
        where: { product: { id: savedProduct.id }, warehouse: { id: warehouse.id } }
      });
      if (!stockExists) {
        await this.stockRepo.save(
          this.stockRepo.create({
            product: savedProduct,
            warehouse: warehouse,
            quantity: 0,
            status: 'OUT'
          })
        );
      }
    }

    return savedProduct;
  }

  async updateProduct(id: string, dto: {
    name?: string;
    categoryId?: string;
    type?: ProductType;
    unitId?: string;
    cost?: number;
    price?: number;
    minimumStock?: number;
    maximumStock?: number;
    warehouseId?: string;
    status?: string;
  }) {
    const prod = await this.findProduct(id);

    if (dto.name) prod.name = dto.name;
    if (dto.type) prod.type = dto.type;
    if (dto.status) prod.status = dto.status;
    if (dto.cost !== undefined) prod.cost = Number(dto.cost);
    if (dto.price !== undefined) prod.price = Number(dto.price);
    if (dto.minimumStock !== undefined) prod.minimumStock = Number(dto.minimumStock);
    if (dto.maximumStock !== undefined) prod.maximumStock = Number(dto.maximumStock);

    if (dto.categoryId) {
      prod.category = (await this.categoryRepo.findOneBy({ id: dto.categoryId }))!;
    }
    if (dto.unitId) {
      prod.unit = (await this.unitRepo.findOneBy({ id: dto.unitId }))!;
    }

    if (dto.warehouseId) {
      const newWh = await this.whRepo.findOneBy({ id: dto.warehouseId });
      prod.warehouse = newWh!;

      // Auto check/initialize stock for the new warehouse
      if (newWh) {
        const stockExists = await this.stockRepo.findOne({
          where: { product: { id: prod.id }, warehouse: { id: newWh.id } }
        });
        if (!stockExists) {
          await this.stockRepo.save(
            this.stockRepo.create({
              product: prod,
              warehouse: newWh,
              quantity: 0,
              status: 'OUT'
            })
          );
        }
      }
    }

    return this.productRepo.save(prod);
  }

  async deleteProduct(id: string) {
    const prod = await this.findProduct(id);
    return this.productRepo.remove(prod);
  }

  // --- CATEGORIES ---
  async findCategories() { return this.categoryRepo.find({ order: { name: 'ASC' } }); }
  async createCategory(name: string, description?: string) {
    return this.categoryRepo.save(this.categoryRepo.create({ name, description }));
  }

  // --- UNITS ---
  async findUnits() { return this.unitRepo.find({ order: { name: 'ASC' } }); }
  async createUnit(name: string) {
    return this.unitRepo.save(this.unitRepo.create({ name }));
  }

  // --- SUPPLIERS ---
  async findSuppliers() { return this.supplierRepo.find({ order: { name: 'ASC' } }); }
  async createSupplier(dto: any) { return this.supplierRepo.save(this.supplierRepo.create(dto)); }
  async updateSupplier(id: string, dto: any) {
    const supplier = await this.supplierRepo.findOneBy({ id });
    if (!supplier) throw new NotFoundException('Supplier not found');
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  // --- CUSTOMERS ---
  async findCustomers() { return this.customerRepo.find({ order: { name: 'ASC' } }); }
  async createCustomer(dto: any) { return this.customerRepo.save(this.customerRepo.create(dto)); }
  async updateCustomer(id: string, dto: any) {
    const customer = await this.customerRepo.findOneBy({ id });
    if (!customer) throw new NotFoundException('Customer not found');
    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  // --- WAREHOUSES ---
  async findWarehouses() {
    return this.whRepo.find({
      relations: { locations: true },
      order: { code: 'ASC' }
    });
  }

  async createWarehouse(dto: { code: string; name: string; location?: string; locations?: string[] }) {
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

    return this.findWarehouses(); // Return with loaded locations
  }
}
