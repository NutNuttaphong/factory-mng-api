import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ProductType } from '../database/entities';

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
  async createProduct(@Body() dto: {
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
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  @RequirePermissions('PRODUCT_UPDATE')
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('PRODUCT_UPDATE') // Or delete permission
  async deleteProduct(@Param('id') id: string) {
    return this.service.deleteProduct(id);
  }

  // --- CATEGORIES ---
  @Get('categories')
  async getCategories() {
    return this.service.findCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; description?: string }) {
    return this.service.createCategory(body.name, body.description);
  }

  // --- UNITS ---
  @Get('units')
  async getUnits() {
    return this.service.findUnits();
  }

  @Post('units')
  async createUnit(@Body() body: { name: string }) {
    return this.service.createUnit(body.name);
  }

  // --- SUPPLIERS ---
  @Get('suppliers')
  async getSuppliers() {
    return this.service.findSuppliers();
  }

  @Post('suppliers')
  async createSupplier(@Body() dto: any) {
    return this.service.createSupplier(dto);
  }

  @Patch('suppliers/:id')
  async updateSupplier(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateSupplier(id, dto);
  }

  // --- CUSTOMERS ---
  @Get('customers')
  async getCustomers() {
    return this.service.findCustomers();
  }

  @Post('customers')
  async createCustomer(@Body() dto: any) {
    return this.service.createCustomer(dto);
  }

  @Patch('customers/:id')
  async updateCustomer(@Param('id') id: string, @Body() dto: any) {
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
  async createWarehouse(@Body() dto: { code: string; name: string; location?: string; locations?: string[] }) {
    return this.service.createWarehouse(dto);
  }
}
