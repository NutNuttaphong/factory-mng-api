import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import {
  SalesOrder,
  SalesOrderSchema,
  Delivery,
  DeliverySchema,
  Customer,
  CustomerSchema,
  Product,
  ProductSchema,
  Stock,
  StockSchema,
} from '../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
    InventoryModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
