import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './rbac.entity';
import { Product, Supplier, Warehouse } from './master.entity';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum GoodsReceiptStatus {
  PENDING_QA = 'PENDING_QA',
  QA_PASSED = 'QA_PASSED',
  QA_FAILED = 'QA_FAILED',
  STOCKED = 'STOCKED',
}

export enum StockMovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export type PurchaseRequestDocument = HydratedDocument<PurchaseRequest>;
export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>;
export type GoodsReceiptDocument = HydratedDocument<GoodsReceipt>;
export type StockDocument = HydratedDocument<Stock>;
export type StockMovementDocument = HydratedDocument<StockMovement>;
export type BOMDocument = HydratedDocument<BOM>;

@Schema()
export class PurchaseRequestItem {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  estimatedPrice: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;
}

export const PurchaseRequestItemSchema = applyMongoTransform(
  SchemaFactory.createForClass(PurchaseRequestItem),
);

@Schema({ timestamps: true, collection: 'purchase_requests' })
export class PurchaseRequest {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester: Ref<User>;

  @Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.DRAFT })
  status: ApprovalStatus;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: [PurchaseRequestItemSchema], default: [] })
  items: PurchaseRequestItem[];

  @Prop({ type: String, default: null })
  comment: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseRequestSchema = applyMongoTransform(
  SchemaFactory.createForClass(PurchaseRequest),
);

@Schema()
export class PurchaseOrderItem {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;
}

export const PurchaseOrderItemSchema = applyMongoTransform(
  SchemaFactory.createForClass(PurchaseOrderItem),
);

@Schema({ timestamps: true, collection: 'purchase_orders' })
export class PurchaseOrder {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplier: Ref<Supplier>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  buyer: Ref<User>;

  @Prop({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.DRAFT })
  status: ApprovalStatus;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: [PurchaseOrderItemSchema], default: [] })
  items: PurchaseOrderItem[];

  @Prop({ type: Types.ObjectId, ref: 'PurchaseRequest', default: null })
  purchaseRequest: Ref<PurchaseRequest> | null;

  @Prop({ type: String, default: null })
  comment: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PurchaseOrderSchema = applyMongoTransform(
  SchemaFactory.createForClass(PurchaseOrder),
);

@Schema()
export class GoodsReceiptItem {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantityReceived: number;

  @Prop({ type: Number, default: 0 })
  quantityAccepted: number;

  @Prop({ type: Number, default: 0 })
  quantityRejected: number;
}

export const GoodsReceiptItemSchema = applyMongoTransform(
  SchemaFactory.createForClass(GoodsReceiptItem),
);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'goods_receipts' })
export class GoodsReceipt {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder', required: true })
  purchaseOrder: Ref<PurchaseOrder>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receivedBy: Ref<User>;

  @Prop({ type: String, enum: Object.values(GoodsReceiptStatus), default: GoodsReceiptStatus.PENDING_QA })
  status: GoodsReceiptStatus;

  @Prop({ type: [GoodsReceiptItemSchema], default: [] })
  items: GoodsReceiptItem[];

  createdAt: Date;
}

export const GoodsReceiptSchema = applyMongoTransform(
  SchemaFactory.createForClass(GoodsReceipt),
);

@Schema({ timestamps: { createdAt: false, updatedAt: true }, collection: 'stocks' })
export class Stock {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouse: Ref<Warehouse>;

  @Prop({ type: Number, default: 0 })
  quantity: number;

  @Prop({ default: 'NORMAL' })
  status: string;

  updatedAt: Date;
}

export const StockSchema = applyMongoTransform(SchemaFactory.createForClass(Stock));
StockSchema.index({ product: 1, warehouse: 1 }, { unique: true });

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'stock_movements' })
export class StockMovement {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(StockMovementType), required: true })
  type: StockMovementType;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', default: null })
  fromWarehouse: Ref<Warehouse> | null;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', default: null })
  toWarehouse: Ref<Warehouse> | null;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, default: null })
  referenceType: string | null;

  @Prop({ type: String, default: null })
  referenceId: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Ref<User>;

  createdAt: Date;
}

export const StockMovementSchema = applyMongoTransform(
  SchemaFactory.createForClass(StockMovement),
);

@Schema()
export class BOMItem {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantityNeeded: number;
}

export const BOMItemSchema = applyMongoTransform(SchemaFactory.createForClass(BOMItem));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'boms' })
export class BOM {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: [BOMItemSchema], default: [] })
  items: BOMItem[];

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
}

export const BOMSchema = applyMongoTransform(SchemaFactory.createForClass(BOM));
