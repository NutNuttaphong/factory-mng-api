import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { InventoryModule } from '../inventory/inventory.module';
import {
  QualityInspection,
  QualityDefect,
  WorkOrder,
  GoodsReceipt,
  Product
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityInspection,
      QualityDefect,
      WorkOrder,
      GoodsReceipt,
      Product
    ]),
    InventoryModule,
  ],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
