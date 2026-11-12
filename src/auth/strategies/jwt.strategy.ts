import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, isValidObjectId } from '../../database/entities';
import { resolveJwtSecret } from '../jwt-secret.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: { sub: string; email: string; tokenVersion?: number }) {
    if (!isValidObjectId(payload?.sub)) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const user = await this.userModel
      .findOne({ _id: payload.sub, isActive: true })
      .populate({ path: 'roles', populate: { path: 'permissions' } })
      .exec();

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return user;
  }
}
