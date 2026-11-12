import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { applyMongoTransform } from './schema.util';
import type { Ref } from './schema.util';

export type PermissionDocument = HydratedDocument<Permission>;
export type RoleDocument = HydratedDocument<Role>;
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'permissions' })
export class Permission {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  code: string;

  @Prop({ type: String, default: null })
  description: string | null;

  createdAt: Date;
}

export const PermissionSchema = applyMongoTransform(SchemaFactory.createForClass(Permission));

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Permission' }], default: [] })
  permissions: Ref<Permission>[];

  createdAt: Date;
  updatedAt: Date;
}

export const RoleSchema = applyMongoTransform(SchemaFactory.createForClass(Role));

@Schema({ timestamps: true, collection: 'users' })
export class User {
  id: string;
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roles: Ref<Role>[];

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = applyMongoTransform(SchemaFactory.createForClass(User));

/** Extracts populated role names, role IDs, and deduplicated permission codes from a user. */
export function extractUserAccess(user?: User | null): {
  roleNames: string[];
  roleIds: string[];
  permissions: string[];
} {
  const roleNames: string[] = [];
  const roleIds: string[] = [];
  const permissions = new Set<string>();

  for (const roleRef of user?.roles ?? []) {
    if (!roleRef || typeof roleRef !== 'object' || !('name' in roleRef)) {
      continue;
    }
    const role = roleRef as Role;
    roleNames.push(role.name);
    roleIds.push(role.id ?? String(role._id));
    for (const permRef of role.permissions ?? []) {
      if (permRef && typeof permRef === 'object' && 'code' in permRef) {
        permissions.add((permRef as Permission).code);
      }
    }
  }

  return { roleNames, roleIds, permissions: Array.from(permissions) };
}
