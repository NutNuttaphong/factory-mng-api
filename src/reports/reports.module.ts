import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import {
  SalesOrder,
  PurchaseOrder,
  WorkOrder,
  Stock,
  QualityInspection,
  AuditLog
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrder,
      PurchaseOrder,
      WorkOrder,
      Stock,
      QualityInspection,
      AuditLog
    ])
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
