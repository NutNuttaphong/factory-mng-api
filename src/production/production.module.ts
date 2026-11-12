import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import {
  ProductionPlan,
  ProductionPlanSchema,
  WorkOrder,
  WorkOrderSchema,
  MaterialIssue,
  MaterialIssueSchema,
  ProductionResult,
  ProductionResultSchema,
  BOM,
  BOMSchema,
  Product,
  ProductSchema,
  Warehouse,
  WarehouseSchema,
  Stock,
  StockSchema,
  User,
  UserSchema,
} from '../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionPlan.name, schema: ProductionPlanSchema },
      { name: WorkOrder.name, schema: WorkOrderSchema },
      { name: MaterialIssue.name, schema: MaterialIssueSchema },
      { name: ProductionResult.name, schema: ProductionResultSchema },
      { name: BOM.name, schema: BOMSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Stock.name, schema: StockSchema },
      { name: User.name, schema: UserSchema },
    ]),
    InventoryModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
