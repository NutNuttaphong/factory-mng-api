import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

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
  async create(
    @Body()
    dto: {
      email: string;
      password?: string;
      fullName: string;
      roleNames: string[];
    },
  ) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('USER_UPDATE')
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      email?: string;
      password?: string;
      fullName?: string;
      roleNames?: string[];
      isActive?: boolean;
    },
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('USER_DELETE')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
