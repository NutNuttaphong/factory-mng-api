import { Controller, Post, Get, Body, HttpCode, HttpStatus, NotImplementedException } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async refresh() {
    throw new NotImplementedException('Refresh tokens are not enabled');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { status: 'success', message: 'Logged out successfully' };
  }

  @Get('me')
  async me(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }
}
