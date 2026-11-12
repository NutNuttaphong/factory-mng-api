import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './rbac.entity';
import { Customer, Product } from './master.entity';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}

export type SalesOrderDocument = HydratedDocument<SalesOrder>;
export type DeliveryDocument = HydratedDocument<Delivery>;

@Schema()
export class SalesOrderItem {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, default: 0 })
  quantityReserved: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;
}

export const SalesOrderItemSchema = applyMongoTransform(
  SchemaFactory.createForClass(SalesOrderItem),
);

@Schema({ timestamps: true, collection: 'sales_orders' })
export class SalesOrder {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Ref<Customer>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  salesperson: Ref<User>;

  @Prop({ type: String, enum: Object.values(SalesOrderStatus), default: SalesOrderStatus.DRAFT })
  status: SalesOrderStatus;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: [SalesOrderItemSchema], default: [] })
  items: SalesOrderItem[];

  @Prop({ type: String, default: null })
  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const SalesOrderSchema = applyMongoTransform(SchemaFactory.createForClass(SalesOrder));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'deliveries' })
export class Delivery {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'SalesOrder', required: true })
  salesOrder: Ref<SalesOrder>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  shippedBy: Ref<User>;

  @Prop({ type: String, enum: Object.values(DeliveryStatus), default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Prop({ type: Date, default: null })
  deliveryDate: Date | null;

  createdAt: Date;
}

export const DeliverySchema = applyMongoTransform(SchemaFactory.createForClass(Delivery));
