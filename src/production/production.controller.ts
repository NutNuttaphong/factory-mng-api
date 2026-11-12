import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { ProductionService } from './production.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

@Controller('production')
export class ProductionController {
  constructor(private service: ProductionService) {}

  // --- BILL OF MATERIALS (BOM) ---

  @Get('boms')
  @RequirePermissions('PRODUCT_VIEW')
  async getBOMs() {
    return this.service.findBOMs();
  }

  @Post('boms')
  @RequirePermissions('PRODUCT_CREATE')
  async createBOM(@Body() dto: any) {
    return this.service.createBOM(dto);
  }

  // --- PLANS ---

  @Get('plans')
  @RequirePermissions('PRODUCTION_CREATE')
  async getPlans() {
    return this.service.findPlans();
  }

  @Post('plans')
  @RequirePermissions('PRODUCTION_CREATE')
  async createPlan(@Body() dto: { productId: string; targetQuantity: number; startDate: Date; endDate: Date }) {
    return this.service.createPlan(dto);
  }

  // --- WORK ORDERS (WO) ---

  @Get('orders')
  @RequirePermissions('PRODUCT_VIEW')
  async getWorkOrders() {
    return this.service.findWorkOrders();
  }

  @Post('orders')
  @RequirePermissions('PRODUCTION_CREATE')
  async createWorkOrder(@Body() dto: { productionPlanId?: string; productId: string; quantity: number; assignedToId: string }) {
    return this.service.createWorkOrder(dto);
  }

  @Get('orders/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getWorkOrder(@Param('id') id: string) {
    return this.service.findWorkOrder(id);
  }

  @Get('orders/:id/requirements')
  @RequirePermissions('PRODUCT_VIEW')
  async checkRequirements(@Param('id') id: string) {
    return this.service.checkMaterialRequirement(id);
  }

  @Post('orders/:id/issue')
  @RequirePermissions('PRODUCTION_CREATE')
  async issueMaterials(
    @Param('id') id: string,
    @Body() body: { warehouseId: string },
    @CurrentUser() user: User
  ) {
    return this.service.issueMaterials(id, body.warehouseId, user);
  }

  @Patch('orders/:id/start')
  @RequirePermissions('PRODUCTION_CREATE')
  async startProduction(@Param('id') id: string) {
    return this.service.startProduction(id);
  }

  @Post('orders/:id/result')
  @RequirePermissions('PRODUCTION_CREATE')
  async reportResult(
    @Param('id') id: string,
    @Body() body: { qtyProduced: number; qtyDefective: number; notes: string },
    @CurrentUser() user: User
  ) {
    return this.service.reportResult(id, body.qtyProduced, body.qtyDefective, body.notes || '', user);
  }
}
