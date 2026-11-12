import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission } from '../database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>
  ) {}

  async findAll() {
    return this.userRepo.find({
      relations: { roles: true },
      order: { fullName: 'ASC' }
    });
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { roles: { permissions: true } }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private sanitizeUser(user: User) {
    const {
      passwordHash: _passwordHash,
      tokenVersion: _tokenVersion,
      ...safeUser
    } = user as User & { passwordHash?: string; tokenVersion?: number };
    return safeUser;
  }

  private isSuperAdmin(user?: User): boolean {
    return Boolean(user?.roles?.some((role) => role.name === 'Super Admin'));
  }

  private getPermissionCodes(user: User): Set<string> {
    const codes = new Set<string>();
    user.roles?.forEach((role) => {
      role.permissions?.forEach((perm) => codes.add(perm.code));
    });
    return codes;
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
      for (const perm of role.permissions ?? []) {
        if (!actorPerms.has(perm.code)) {
          throw new ForbiddenException(`Cannot assign role "${role.name}" containing unheld permission ${perm.code}`);
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
      const role =
        typeof this.roleRepo.findOne === 'function'
          ? await this.roleRepo.findOne({ where: { name }, relations: { permissions: true } })
          : await this.roleRepo.findOneBy({ name });
      if (!role) throw new BadRequestException(`Unknown role: ${name}`);
      userRoles.push(role);
    }

    this.assertCanDelegateRoles(userRoles, actor);
    return userRoles;
  }

  async create(dto: { email: string; password: string; fullName: string; roleNames: string[] }, actor?: User) {
    const userRoles = await this.resolveRoles(dto.roleNames, actor);
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      roles: userRoles,
      isActive: true
    });

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async update(
    id: string,
    dto: { email?: string; password?: string; fullName?: string; roleNames?: string[]; isActive?: boolean },
    actor?: User
  ) {
    const user = await this.findOne(id);
    this.assertCanModifyUser(user, actor, dto.roleNames !== undefined);

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findOneBy({ email: dto.email });
      if (exists) throw new BadRequestException('Email already in use');
      user.email = dto.email;
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
      user.roles = await this.resolveRoles(dto.roleNames, actor);
      revokeSessions = true;
    }

    if (revokeSessions) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async remove(id: string, actor?: User) {
    const user = await this.findOne(id);
    if (actor && actor.id === user.id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    this.assertCanModifyUser(user, actor);
    const removed = await this.userRepo.remove(user);
    return this.sanitizeUser(removed);
  }

  async getRoles() {
    return this.roleRepo.find({ relations: { permissions: true } });
  }

  async getPermissions() {
    return this.permRepo.find();
  }
}
