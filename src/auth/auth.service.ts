import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id };
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
}
