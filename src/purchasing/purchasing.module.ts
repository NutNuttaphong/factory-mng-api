import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalHistory,
  Product,
  Supplier,
  User
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseRequest,
      PurchaseRequestItem,
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      ApprovalWorkflow,
      ApprovalStep,
      ApprovalHistory,
      Product,
      Supplier,
      User
    ])
  ],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
