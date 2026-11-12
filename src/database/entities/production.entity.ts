import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './rbac.entity';
import { Product, Warehouse } from './master.entity';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_MATERIAL = 'PENDING_MATERIAL',
  MATERIAL_ISSUED = 'MATERIAL_ISSUED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PENDING_QA = 'PENDING_QA',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type ProductionPlanDocument = HydratedDocument<ProductionPlan>;
export type WorkOrderDocument = HydratedDocument<WorkOrder>;
export type MaterialIssueDocument = HydratedDocument<MaterialIssue>;
export type ProductionResultDocument = HydratedDocument<ProductionResult>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'production_plans' })
export class ProductionPlan {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  targetQuantity: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ default: 'PENDING' })
  status: string;

  createdAt: Date;
}

export const ProductionPlanSchema = applyMongoTransform(
  SchemaFactory.createForClass(ProductionPlan),
);

@Schema({ timestamps: true, collection: 'work_orders' })
export class WorkOrder {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'ProductionPlan', default: null })
  productionPlan: Ref<ProductionPlan> | null;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, enum: Object.values(WorkOrderStatus), default: WorkOrderStatus.DRAFT })
  status: WorkOrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedTo: Ref<User>;

  createdAt: Date;
  updatedAt: Date;
}

export const WorkOrderSchema = applyMongoTransform(SchemaFactory.createForClass(WorkOrder));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'material_issues' })
export class MaterialIssue {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'WorkOrder', required: true })
  workOrder: Ref<WorkOrder>;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouse: Ref<Warehouse>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  issuedBy: Ref<User>;

  @Prop({
    type: [
      {
        productId: String,
        productCode: String,
        productName: String,
        quantityRequired: Number,
        quantityIssued: Number,
      },
    ],
    default: [],
  })
  items: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantityRequired: number;
    quantityIssued: number;
  }>;

  createdAt: Date;
}

export const MaterialIssueSchema = applyMongoTransform(
  SchemaFactory.createForClass(MaterialIssue),
);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'production_results' })
export class ProductionResult {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'WorkOrder', required: true })
  workOrder: Ref<WorkOrder>;

  @Prop({ type: Number, required: true })
  quantityProduced: number;

  @Prop({ type: Number, default: 0 })
  quantityDefective: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  operator: Ref<User>;

  @Prop({ type: String, default: null })
  notes: string | null;

  createdAt: Date;
}

export const ProductionResultSchema = applyMongoTransform(
  SchemaFactory.createForClass(ProductionResult),
);
