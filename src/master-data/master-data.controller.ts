import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MasterDataService } from './master-data.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ProductType } from '../database/entities';

class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  minimumStock: number;

  @IsNumber()
  @Min(0)
  maximumStock: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumStock?: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];
}

@Controller()
export class MasterDataController {
  constructor(private service: MasterDataService) {}

  // --- PRODUCTS ---
  @Get('products')
  @RequirePermissions('PRODUCT_VIEW')
  async getProducts() {
    return this.service.findProducts();
  }

  @Get('products/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getProduct(@Param('id') id: string) {
    return this.service.findProduct(id);
  }

  @Post('products')
  @RequirePermissions('PRODUCT_CREATE')
  async createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  @RequirePermissions('PRODUCT_UPDATE')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('PRODUCT_UPDATE') // Or delete permission
  async deleteProduct(@Param('id') id: string) {
    return this.service.deleteProduct(id);
  }

  // --- CATEGORIES ---
  @Get('categories')
  @RequirePermissions('PRODUCT_VIEW')
  async getCategories() {
    return this.service.findCategories();
  }

  @Post('categories')
  @RequirePermissions('PRODUCT_CREATE')
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.service.createCategory(body.name, body.description);
  }

  // --- UNITS ---
  @Get('units')
  @RequirePermissions('PRODUCT_VIEW')
  async getUnits() {
    return this.service.findUnits();
  }

  @Post('units')
  @RequirePermissions('PRODUCT_CREATE')
  async createUnit(@Body() body: CreateUnitDto) {
    return this.service.createUnit(body.name);
  }

  // --- SUPPLIERS ---
  @Get('suppliers')
  @RequirePermissions('PRODUCT_VIEW')
  async getSuppliers() {
    return this.service.findSuppliers();
  }

  @Post('suppliers')
  @RequirePermissions('PRODUCT_CREATE')
  async createSupplier(@Body() dto: CreatePartnerDto) {
    return this.service.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('PRODUCT_UPDATE')
  async updateSupplier(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.updateSupplier(id, dto);
  }

  // --- CUSTOMERS ---
  @Get('customers')
  @RequirePermissions('PRODUCT_VIEW')
  async getCustomers() {
    return this.service.findCustomers();
  }

  @Post('customers')
  @RequirePermissions('PRODUCT_CREATE')
  async createCustomer(@Body() dto: CreatePartnerDto) {
    return this.service.createCustomer(dto);
  }

  @Patch('customers/:id')
  @RequirePermissions('PRODUCT_UPDATE')
  async updateCustomer(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.updateCustomer(id, dto);
  }

  // --- WAREHOUSES ---
  @Get('warehouses')
  @RequirePermissions('STOCK_VIEW')
  async getWarehouses() {
    return this.service.findWarehouses();
  }

  @Post('warehouses')
  @RequirePermissions('STOCK_ADJUST')
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }
}
