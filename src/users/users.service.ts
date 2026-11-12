import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async create(dto: { email: string; password?: string; fullName: string; roleNames: string[] }) {
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new BadRequestException('Email already in use');

    const password = dto.password || 'FactoryMng2026!';
    const passwordHash = await bcrypt.hash(password, 10);

    const userRoles: Role[] = [];
    for (const name of dto.roleNames) {
      const role = await this.roleRepo.findOneBy({ name });
      if (role) userRoles.push(role);
    }

    const user = this.userRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      roles: userRoles,
      isActive: true
    });

    return this.userRepo.save(user);
  }

  async update(id: string, dto: { email?: string; password?: string; fullName?: string; roleNames?: string[]; isActive?: boolean }) {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findOneBy({ email: dto.email });
      if (exists) throw new BadRequestException('Email already in use');
      user.email = dto.email;
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleNames) {
      const userRoles: Role[] = [];
      for (const name of dto.roleNames) {
        const role = await this.roleRepo.findOneBy({ name });
        if (role) userRoles.push(role);
      }
      user.roles = userRoles;
    }

    return this.userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    return this.userRepo.remove(user);
  }

  async getRoles() {
    return this.roleRepo.find({ relations: { permissions: true } });
  }

  async getPermissions() {
    return this.permRepo.find();
  }
}
