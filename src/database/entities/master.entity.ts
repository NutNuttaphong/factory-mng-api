import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export type CategoryDocument = HydratedDocument<Category>;
export type UnitDocument = HydratedDocument<Unit>;
export type SupplierDocument = HydratedDocument<Supplier>;
export type CustomerDocument = HydratedDocument<Customer>;
export type WarehouseDocument = HydratedDocument<Warehouse>;
export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'categories' })
export class Category {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  createdAt: Date;
}

export const CategorySchema = applyMongoTransform(SchemaFactory.createForClass(Category));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'units' })
export class Unit {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  createdAt: Date;
}

export const UnitSchema = applyMongoTransform(SchemaFactory.createForClass(Unit));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'suppliers' })
export class Supplier {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  contactName: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
}

export const SupplierSchema = applyMongoTransform(SchemaFactory.createForClass(Supplier));

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'customers' })
export class Customer {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  contactName: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
}

export const CustomerSchema = applyMongoTransform(SchemaFactory.createForClass(Customer));

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class WarehouseLocation {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  code: string;

  createdAt: Date;
}

export const WarehouseLocationSchema = applyMongoTransform(
  SchemaFactory.createForClass(WarehouseLocation),
);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'warehouses' })
export class Warehouse {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  location: string | null;

  @Prop({ type: [WarehouseLocationSchema], default: [] })
  locations: WarehouseLocation[];

  createdAt: Date;
}

export const WarehouseSchema = applyMongoTransform(SchemaFactory.createForClass(Warehouse));

export enum ProductType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  PACKAGING = 'PACKAGING',
  SEMI_FINISHED = 'SEMI_FINISHED',
  FINISHED_GOOD = 'FINISHED_GOOD',
}

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  category: Ref<Category> | null;

  @Prop({ type: String, enum: Object.values(ProductType), default: ProductType.RAW_MATERIAL })
  type: ProductType;

  @Prop({ type: Types.ObjectId, ref: 'Unit', default: null })
  unit: Ref<Unit> | null;

  @Prop({ type: Number, default: 0 })
  cost: number;

  @Prop({ type: Number, default: 0 })
  price: number;

  @Prop({ type: Number, default: 0 })
  minimumStock: number;

  @Prop({ type: Number, default: 999999 })
  maximumStock: number;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', default: null })
  warehouse: Ref<Warehouse> | null;

  @Prop({ default: 'ACTIVE' })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = applyMongoTransform(SchemaFactory.createForClass(Product));
