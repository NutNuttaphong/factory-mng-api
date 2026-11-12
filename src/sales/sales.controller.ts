import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { SalesService } from './sales.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

class SalesOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

class CreateSalesOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}

@Controller('sales')
export class SalesController {
  constructor(private service: SalesService) {}

  @Get('orders')
  @RequirePermissions('PRODUCT_VIEW')
  async getOrders() {
    return this.service.findOrders();
  }

  @Get('orders/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getOrder(@Param('id') id: string) {
    return this.service.findOrder(id);
  }

  @Post('orders')
  @RequirePermissions('PRODUCT_CREATE') // Or sales order create permission
  async createOrder(@CurrentUser() user: User, @Body() body: CreateSalesOrderDto) {
    return this.service.createOrder(user, body.customerId, body.items);
  }

  @Patch('orders/:id/reserve')
  @RequirePermissions('STOCK_ADJUST')
  async reserveStock(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.reserveStock(id, user);
  }

  @Post('orders/:id/delivery')
  @RequirePermissions('STOCK_ADJUST') // Warehouse or Admin who ships
  async createDelivery(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.createDelivery(id, user);
  }

  @Get('deliveries')
  @RequirePermissions('PRODUCT_VIEW')
  async getDeliveries() {
    return this.service.findDeliveries();
  }
}
