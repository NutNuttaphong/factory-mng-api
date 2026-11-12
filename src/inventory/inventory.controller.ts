import { Controller, Get, Post, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Get('stocks')
  @RequirePermissions('STOCK_VIEW')
  async getStocks() {
    return this.service.getStockOverview();
  }

  @Get('movements')
  @RequirePermissions('STOCK_VIEW')
  async getMovements() {
    return this.service.getMovements();
  }

  @Post('in')
  @RequirePermissions('STOCK_ADJUST')
  async stockIn(
    @CurrentUser() user: User,
    @Body() body: { productId: string; warehouseId: string; quantity: number; referenceType: string; referenceId: string }
  ) {
    return this.service.stockIn(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
  }

  @Post('out')
  @RequirePermissions('STOCK_ADJUST')
  async stockOut(
    @CurrentUser() user: User,
    @Body() body: { productId: string; warehouseId: string; quantity: number; referenceType: string; referenceId: string }
  ) {
    return this.service.stockOut(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
  }

  @Post('transfer')
  @RequirePermissions('STOCK_ADJUST')
  async transfer(
    @CurrentUser() user: User,
    @Body() body: { productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number }
  ) {
    return this.service.transfer(body.productId, body.fromWarehouseId, body.toWarehouseId, body.quantity, user);
  }

  @Post('adjustment')
  @RequirePermissions('STOCK_ADJUST')
  async adjust(
    @CurrentUser() user: User,
    @Body() body: { productId: string; warehouseId: string; quantity: number }
  ) {
    return this.service.adjust(body.productId, body.warehouseId, body.quantity, user);
  }
}
