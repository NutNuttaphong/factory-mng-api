import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User, Role } from './rbac.entity';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export type ApprovalWorkflowDocument = HydratedDocument<ApprovalWorkflow>;
export type ApprovalStepDocument = HydratedDocument<ApprovalStep>;
export type ApprovalHistoryDocument = HydratedDocument<ApprovalHistory>;
export type AuditLogDocument = HydratedDocument<AuditLog>;
export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'approval_workflows' })
export class ApprovalWorkflow {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true })
  targetType: string;

  @Prop({ type: Number, required: true })
  minAmount: number;

  @Prop({ type: Number, required: true })
  maxAmount: number;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
}

export const ApprovalWorkflowSchema = applyMongoTransform(
  SchemaFactory.createForClass(ApprovalWorkflow),
);

@Schema({ collection: 'approval_steps' })
export class ApprovalStep {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalWorkflow', required: true })
  workflow: Ref<ApprovalWorkflow>;

  @Prop({ type: Number, required: true })
  stepOrder: number;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Ref<Role>;
}

export const ApprovalStepSchema = applyMongoTransform(SchemaFactory.createForClass(ApprovalStep));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'approval_histories' })
export class ApprovalHistory {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Ref<User>;

  @Prop({ required: true })
  action: string;

  @Prop({ type: String, default: null })
  comment: string | null;

  @Prop({ type: String, default: null })
  previousStatus: string | null;

  @Prop({ type: String, default: null })
  newStatus: string | null;

  createdAt: Date;
}

export const ApprovalHistorySchema = applyMongoTransform(
  SchemaFactory.createForClass(ApprovalHistory),
);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  id: string;
  _id: Types.ObjectId;

  @Prop({ type: String, default: null })
  userEmail: string | null;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  entityName: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ type: String, default: null })
  beforeState: string | null;

  @Prop({ type: String, default: null })
  afterState: string | null;

  @Prop({ type: String, default: null })
  ipAddress: string | null;

  createdAt: Date;
}

export const AuditLogSchema = applyMongoTransform(SchemaFactory.createForClass(AuditLog));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' })
export class Notification {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: String, default: null })
  recipientRole: string | null;

  @Prop({ type: String, default: null })
  recipientId: string | null;

  @Prop({ type: String, default: null })
  entityType: string | null;

  @Prop({ type: String, default: null })
  entityId: string | null;

  createdAt: Date;
}

export const NotificationSchema = applyMongoTransform(SchemaFactory.createForClass(Notification));
