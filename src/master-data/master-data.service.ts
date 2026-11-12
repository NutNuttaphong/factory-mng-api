import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Category,
  Unit,
  Supplier,
  Customer,
  Warehouse,
  Product,
  ProductType,
  Stock,
  isValidObjectId,
} from '../database/entities';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Unit.name) private unitModel: Model<Unit>,
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Warehouse.name) private whModel: Model<Warehouse>,
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
  ) {}

  // --- PRODUCTS ---

  async findProducts() {
    return this.productModel
      .find()
      .populate(['category', 'unit', 'warehouse'])
      .sort({ code: 1 })
      .exec();
  }

  async findProduct(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Product not found');
    }
    const prod = await this.productModel
      .findById(id)
      .populate(['category', 'unit', 'warehouse'])
      .exec();
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
    const exists = await this.productModel.findOne({ code: dto.code }).exec();
    if (exists) throw new BadRequestException('Product code already exists');

    const cat = isValidObjectId(dto.categoryId)
      ? await this.categoryModel.findById(dto.categoryId).exec()
      : null;
    const unit = isValidObjectId(dto.unitId)
      ? await this.unitModel.findById(dto.unitId).exec()
      : null;
    const warehouse =
      dto.warehouseId && isValidObjectId(dto.warehouseId)
        ? await this.whModel.findById(dto.warehouseId).exec()
        : null;

    const created = await this.productModel.create({
      code: dto.code,
      name: dto.name,
      category: cat?._id ?? null,
      type: dto.type,
      unit: unit?._id ?? null,
      cost: Number(dto.cost),
      price: Number(dto.price),
      minimumStock: Number(dto.minimumStock),
      maximumStock: Number(dto.maximumStock),
      warehouse: warehouse?._id ?? null,
      status: 'ACTIVE',
    });

    if (warehouse) {
      const stockExists = await this.stockModel
        .findOne({ product: created._id, warehouse: warehouse._id })
        .exec();
      if (!stockExists) {
        await this.stockModel.create({
          product: created._id,
          warehouse: warehouse._id,
          quantity: 0,
          status: 'OUT',
        });
      }
    }

    return this.findProduct(created.id);
  }

  async updateProduct(
    id: string,
    dto: {
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
    },
  ) {
    const prod = await this.findProduct(id);

    if (dto.name) prod.name = dto.name;
    if (dto.type) prod.type = dto.type;
    if (dto.status) prod.status = dto.status;
    if (dto.cost !== undefined) prod.cost = Number(dto.cost);
    if (dto.price !== undefined) prod.price = Number(dto.price);
    if (dto.minimumStock !== undefined) prod.minimumStock = Number(dto.minimumStock);
    if (dto.maximumStock !== undefined) prod.maximumStock = Number(dto.maximumStock);

    if (dto.categoryId && isValidObjectId(dto.categoryId)) {
      const cat = await this.categoryModel.findById(dto.categoryId).exec();
      prod.category = (cat?._id ?? null) as any;
    }
    if (dto.unitId && isValidObjectId(dto.unitId)) {
      const unit = await this.unitModel.findById(dto.unitId).exec();
      prod.unit = (unit?._id ?? null) as any;
    }

    if (dto.warehouseId && isValidObjectId(dto.warehouseId)) {
      const newWh = await this.whModel.findById(dto.warehouseId).exec();
      prod.warehouse = (newWh?._id ?? null) as any;

      if (newWh) {
        const stockExists = await this.stockModel
          .findOne({ product: prod._id, warehouse: newWh._id })
          .exec();
        if (!stockExists) {
          await this.stockModel.create({
            product: prod._id,
            warehouse: newWh._id,
            quantity: 0,
            status: 'OUT',
          });
        }
      }
    }

    await prod.save();
    return this.findProduct(id);
  }

  async deleteProduct(id: string) {
    const prod = await this.findProduct(id);
    await this.productModel.deleteOne({ _id: prod._id }).exec();
    return prod;
  }

  // --- CATEGORIES ---
  async findCategories() {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }
  async createCategory(name: string, description?: string) {
    return this.categoryModel.create({ name, description: description ?? null });
  }

  // --- UNITS ---
  async findUnits() {
    return this.unitModel.find().sort({ name: 1 }).exec();
  }
  async createUnit(name: string) {
    return this.unitModel.create({ name });
  }

  // --- SUPPLIERS ---
  async findSuppliers() {
    return this.supplierModel.find().sort({ name: 1 }).exec();
  }
  async createSupplier(dto: any) {
    return this.supplierModel.create(dto);
  }
  async updateSupplier(id: string, dto: any) {
    if (!isValidObjectId(id)) throw new NotFoundException('Supplier not found');
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) throw new NotFoundException('Supplier not found');
    Object.assign(supplier, dto);
    return supplier.save();
  }

  // --- CUSTOMERS ---
  async findCustomers() {
    return this.customerModel.find().sort({ name: 1 }).exec();
  }
  async createCustomer(dto: any) {
    return this.customerModel.create(dto);
  }
  async updateCustomer(id: string, dto: any) {
    if (!isValidObjectId(id)) throw new NotFoundException('Customer not found');
    const customer = await this.customerModel.findById(id).exec();
    if (!customer) throw new NotFoundException('Customer not found');
    Object.assign(customer, dto);
    return customer.save();
  }

  // --- WAREHOUSES ---
  async findWarehouses() {
    return this.whModel.find().sort({ code: 1 }).exec();
  }

  async createWarehouse(dto: { code: string; name: string; location?: string; locations?: string[] }) {
    await this.whModel.create({
      code: dto.code,
      name: dto.name,
      location: dto.location ?? null,
      locations: (dto.locations || []).map((locCode) => ({ code: locCode })),
    });
    return this.findWarehouses();
  }
}
