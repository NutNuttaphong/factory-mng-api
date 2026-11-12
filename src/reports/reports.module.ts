import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import {
  SalesOrder,
  SalesOrderSchema,
  PurchaseOrder,
  PurchaseOrderSchema,
  WorkOrder,
  WorkOrderSchema,
  Stock,
  StockSchema,
  QualityInspection,
  QualityInspectionSchema,
  AuditLog,
  AuditLogSchema,
} from '../database/entities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: WorkOrder.name, schema: WorkOrderSchema },
      { name: Stock.name, schema: StockSchema },
      { name: QualityInspection.name, schema: QualityInspectionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
