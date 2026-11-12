import { Controller, Get, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.service.findForUser(user);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}
