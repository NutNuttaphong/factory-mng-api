import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';
import {
  QualityInspection,
  QualityInspectionSchema,
  QualityDefect,
  QualityDefectSchema,
  WorkOrder,
  WorkOrderSchema,
  GoodsReceipt,
  GoodsReceiptSchema,
  Product,
  ProductSchema,
} from '../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QualityInspection.name, schema: QualityInspectionSchema },
      { name: QualityDefect.name, schema: QualityDefectSchema },
      { name: WorkOrder.name, schema: WorkOrderSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    InventoryModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
