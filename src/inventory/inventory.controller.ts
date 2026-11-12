import { Controller, Get, Post, Body } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

class StockMovementDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  referenceType: string;

  @IsString()
  @IsNotEmpty()
  referenceId: string;
}

class StockTransferDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

class StockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

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
  async stockIn(@CurrentUser() user: User, @Body() body: StockMovementDto) {
    return this.service.stockIn(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
  }

  @Post('out')
  @RequirePermissions('STOCK_ADJUST')
  async stockOut(@CurrentUser() user: User, @Body() body: StockMovementDto) {
    return this.service.stockOut(body.productId, body.warehouseId, body.quantity, body.referenceType, body.referenceId, user);
  }

  @Post('transfer')
  @RequirePermissions('STOCK_ADJUST')
  async transfer(@CurrentUser() user: User, @Body() body: StockTransferDto) {
    return this.service.transfer(body.productId, body.fromWarehouseId, body.toWarehouseId, body.quantity, user);
  }

  @Post('adjustment')
  @RequirePermissions('STOCK_ADJUST')
  async adjust(@CurrentUser() user: User, @Body() body: StockAdjustmentDto) {
    return this.service.adjust(body.productId, body.warehouseId, body.quantity, user);
  }
}
