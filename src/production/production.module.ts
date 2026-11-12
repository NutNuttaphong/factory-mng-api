import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { InventoryModule } from '../inventory/inventory.module';
import {
  ProductionPlan,
  WorkOrder,
  MaterialIssue,
  ProductionResult,
  BOM,
  BOMItem,
  Product,
  Warehouse,
  Stock,
  User
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionPlan,
      WorkOrder,
      MaterialIssue,
      ProductionResult,
      BOM,
      BOMItem,
      Product,
      Warehouse,
      Stock,
      User
    ]),
    InventoryModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
