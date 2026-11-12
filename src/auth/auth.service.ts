import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, extractUserAccess, isValidObjectId } from '../database/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userModel
      .findOne({ email: normalizedEmail, isActive: true })
      .select('+passwordHash')
      .populate({ path: 'roles', populate: { path: 'permissions' } })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { email: user.email, sub: user.id, tokenVersion: user.tokenVersion ?? 0 };
    const accessToken = this.jwtService.sign(payload);
    const { roleNames, permissions } = extractUserAccess(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleNames,
        permissions,
      },
    };
  }

  async getMe(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .populate({ path: 'roles', populate: { path: 'permissions' } })
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { roleNames, permissions } = extractUserAccess(user);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: roleNames,
      permissions,
    };
  }

  async logout(userId: string) {
    if (isValidObjectId(userId)) {
      await this.userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }).exec();
    }
    return { status: 'success', message: 'Logged out successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!isValidObjectId(userId)) {
      throw new UnauthorizedException('User not found');
    }

    const user = await this.userModel
      .findOne({ _id: userId, isActive: true })
      .select('+passwordHash')
      .exec();

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
    await user.save();

    const accessToken = this.jwtService.sign({
      email: user.email,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    });

    return { status: 'success', message: 'Password changed successfully', accessToken };
  }
}
