import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission, extractUserAccess, asDoc, isValidObjectId } from '../database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(Permission.name) private permModel: Model<Permission>,
  ) {}

  async findAll() {
    const users = await this.userModel
      .find()
      .populate('roles')
      .sort({ fullName: 1 })
      .exec();
    return users.map((u) => this.sanitizeUser(u));
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('User not found');
    }
    const user = await this.userModel
      .findById(id)
      .populate({ path: 'roles', populate: { path: 'permissions' } })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private sanitizeUser(user: any) {
    const plain = typeof user?.toJSON === 'function' ? user.toJSON() : { ...user };
    const {
      passwordHash: _passwordHash,
      tokenVersion: _tokenVersion,
      ...safeUser
    } = plain;
    return safeUser;
  }

  private isSuperAdmin(user?: User): boolean {
    return extractUserAccess(user).roleNames.includes('Super Admin');
  }

  private getPermissionCodes(user: User): Set<string> {
    return new Set(extractUserAccess(user).permissions);
  }

  private assertCanDelegateRoles(roles: Role[], actor?: User): void {
    if (!actor || this.isSuperAdmin(actor)) {
      return;
    }
    if (roles.some((role) => role.name === 'Super Admin')) {
      throw new ForbiddenException('Only Super Admin can assign the Super Admin role');
    }
    const actorPerms = this.getPermissionCodes(actor);
    for (const role of roles) {
      for (const permRef of role.permissions ?? []) {
        const perm = asDoc(permRef);
        if (!actorPerms.has(perm.code)) {
          throw new ForbiddenException(
            `Cannot assign role "${role.name}" containing unheld permission ${perm.code}`,
          );
        }
      }
    }
  }

  private assertCanModifyUser(target: User, actor?: User, isUpdatingRoles = false): void {
    if (!actor || this.isSuperAdmin(actor)) {
      return;
    }
    if (this.isSuperAdmin(target)) {
      throw new ForbiddenException('Only Super Admin can modify or delete a Super Admin user');
    }
    if (isUpdatingRoles && actor.id === target.id) {
      throw new ForbiddenException('You cannot modify your own roles');
    }
    const actorPerms = this.getPermissionCodes(actor);
    for (const permCode of this.getPermissionCodes(target)) {
      if (!actorPerms.has(permCode)) {
        throw new ForbiddenException('Cannot manage a user who holds permissions beyond your own');
      }
    }
  }

  private async resolveRoles(roleNames: string[], actor?: User): Promise<Role[]> {
    if (actor && !this.isSuperAdmin(actor) && roleNames.includes('Super Admin')) {
      throw new ForbiddenException('Only Super Admin can assign the Super Admin role');
    }

    const userRoles: Role[] = [];
    for (const name of roleNames) {
      const role = await this.roleModel
        .findOne({ name })
        .populate('permissions')
        .exec();
      if (!role) throw new BadRequestException(`Unknown role: ${name}`);
      userRoles.push(role);
    }

    this.assertCanDelegateRoles(userRoles, actor);
    return userRoles;
  }

  async create(
    dto: { email: string; password: string; fullName: string; roleNames: string[] },
    actor?: User,
  ) {
    const userRoles = await this.resolveRoles(dto.roleNames, actor);
    const normalizedEmail = dto.email.trim().toLowerCase();
    const exists = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.userModel.create({
      email: normalizedEmail,
      fullName: dto.fullName,
      passwordHash,
      roles: userRoles.map((r) => r._id ?? r),
      isActive: true,
    });

    const populated = await this.findOne(created.id);
    return this.sanitizeUser(populated);
  }

  async update(
    id: string,
    dto: {
      email?: string;
      password?: string;
      fullName?: string;
      roleNames?: string[];
      isActive?: boolean;
    },
    actor?: User,
  ) {
    const user = await this.findOne(id);
    this.assertCanModifyUser(user, actor, dto.roleNames !== undefined);

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const exists = await this.userModel.findOne({ email: normalizedEmail }).exec();
        if (exists) throw new BadRequestException('Email already in use');
        user.email = normalizedEmail;
      }
    }

    if (dto.fullName) user.fullName = dto.fullName;

    let revokeSessions = false;
    if (dto.isActive !== undefined) {
      if (dto.isActive === false) revokeSessions = true;
      user.isActive = dto.isActive;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
      revokeSessions = true;
    }

    if (dto.roleNames) {
      const roles = await this.resolveRoles(dto.roleNames, actor);
      user.roles = roles.map((r) => r._id ?? r) as any;
      revokeSessions = true;
    }

    if (revokeSessions) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }

    await user.save();
    const refreshed = await this.findOne(id);
    return this.sanitizeUser(refreshed);
  }

  async remove(id: string, actor?: User) {
    const user = await this.findOne(id);
    if (actor && actor.id === user.id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    this.assertCanModifyUser(user, actor);
    await this.userModel.deleteOne({ _id: user._id }).exec();
    return this.sanitizeUser(user);
  }

  async getRoles() {
    return this.roleModel.find().populate('permissions').exec();
  }

  async getPermissions() {
    return this.permModel.find().exec();
  }
}
