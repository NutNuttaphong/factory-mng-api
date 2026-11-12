import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/rbac.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id, tokenVersion: user.tokenVersion ?? 0 };
    const accessToken = this.jwtService.sign(payload);

    // Extract flat permission list
    const permissions = new Set<string>();
    user.roles.forEach((role) => {
      role.permissions?.forEach((perm) => {
        permissions.add(perm.code);
      });
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map((r) => r.name),
        permissions: Array.from(permissions),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = new Set<string>();
    user.roles.forEach((role) => {
      role.permissions?.forEach((perm) => {
        permissions.add(perm.code);
      });
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.name),
      permissions: Array.from(permissions),
    };
  }

  async logout(userId: string) {
    await this.userRepo.increment({ id: userId }, 'tokenVersion', 1);
    return { status: 'success', message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepo.save(user);

    const accessToken = this.jwtService.sign({
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    });

    return { status: 'success', message: 'Password changed successfully', accessToken };
  }
}
