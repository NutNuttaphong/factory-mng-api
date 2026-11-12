import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './rbac.entity';
import { Product } from './master.entity';
import { WorkOrder } from './production.entity';
import { GoodsReceipt } from './purchasing-inventory.entity';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export enum QAStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  REWORK = 'REWORK',
}

export type QualityInspectionDocument = HydratedDocument<QualityInspection>;
export type QualityDefectDocument = HydratedDocument<QualityDefect>;

@Schema({ timestamps: true, collection: 'quality_inspections' })
export class QualityInspection {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Ref<Product>;

  @Prop({ type: Types.ObjectId, ref: 'WorkOrder', default: null })
  workOrder: Ref<WorkOrder> | null;

  @Prop({ type: Types.ObjectId, ref: 'GoodsReceipt', default: null })
  goodsReceipt: Ref<GoodsReceipt> | null;

  @Prop({ type: String, default: null })
  batchNo: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inspector: Ref<User>;

  @Prop({ type: Number, default: null })
  weight: number | null;

  @Prop({ type: Number, default: null })
  size: number | null;

  @Prop({ type: String, default: null })
  color: string | null;

  @Prop({ type: Number, default: null })
  temperature: number | null;

  @Prop({ type: String, default: null })
  defectDetails: string | null;

  @Prop({ type: String, enum: Object.values(QAStatus), default: QAStatus.PASS })
  status: QAStatus;

  @Prop({ type: String, default: null })
  comment: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const QualityInspectionSchema = applyMongoTransform(
  SchemaFactory.createForClass(QualityInspection),
);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'quality_defects' })
export class QualityDefect {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'QualityInspection', required: true })
  inspection: Ref<QualityInspection>;

  @Prop({ required: true })
  defectType: string;

  @Prop({ type: Number, default: 1 })
  severity: number;

  @Prop({ type: String, default: null })
  description: string | null;

  createdAt: Date;
}

export const QualityDefectSchema = applyMongoTransform(
  SchemaFactory.createForClass(QualityDefect),
);
