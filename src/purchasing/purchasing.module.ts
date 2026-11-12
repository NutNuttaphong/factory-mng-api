import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasingController } from './purchasing.controller';
import { PurchasingService } from './purchasing.service';
import {
  PurchaseRequest,
  PurchaseRequestSchema,
  PurchaseOrder,
  PurchaseOrderSchema,
  GoodsReceipt,
  GoodsReceiptSchema,
  ApprovalWorkflow,
  ApprovalWorkflowSchema,
  ApprovalStep,
  ApprovalStepSchema,
  ApprovalHistory,
  ApprovalHistorySchema,
  Product,
  ProductSchema,
  Supplier,
  SupplierSchema,
  User,
  UserSchema,
} from '../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequest.name, schema: PurchaseRequestSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: ApprovalWorkflow.name, schema: ApprovalWorkflowSchema },
      { name: ApprovalStep.name, schema: ApprovalStepSchema },
      { name: ApprovalHistory.name, schema: ApprovalHistorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
