import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsArray()
  @IsString({ each: true })
  roleNames: string[];
}

class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('USER_VIEW')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('meta/roles')
  @RequirePermissions('USER_VIEW')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get('meta/permissions')
  @RequirePermissions('USER_VIEW')
  async getPermissions() {
    return this.usersService.getPermissions();
  }

  @Get(':id')
  @RequirePermissions('USER_VIEW')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('USER_CREATE')
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('USER_UPDATE')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('USER_DELETE')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
