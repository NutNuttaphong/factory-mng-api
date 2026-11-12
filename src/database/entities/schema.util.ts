import { BadRequestException } from '@nestjs/common';
import { Schema, Types } from 'mongoose';

/**
 * Configures Mongoose schema JSON/Object serialization so `id` (string) is
 * exposed and internal MongoDB `_id` / `__v` / `passwordHash` are stripped.
 */
export function applyMongoTransform<T>(schema: Schema<T>): Schema<T> {
  const transform = (_doc: unknown, ret: Record<string, any>) => {
    if (ret._id !== undefined && ret._id !== null) {
      ret.id = String(ret._id);
      delete ret._id;
    }
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  };

  schema.set('toJSON', { virtuals: true, versionKey: false, transform });
  schema.set('toObject', { virtuals: true, versionKey: false, transform });
  return schema;
}

export type Ref<T> = T | Types.ObjectId;

export function isValidObjectId(id: string | undefined | null): boolean {
  return Boolean(id && Types.ObjectId.isValid(id));
}

export function assertValidObjectId(id: string | undefined | null, label = 'Resource'): string {
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Invalid ${label} ID`);
  }
  return id;
}

export function refId(value: any): any {
  if (!value) return undefined;
  return value._id ?? value.id ?? value;
}

export function asDoc<T>(value: Ref<T>): T {
  return value as T;
}
