import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Notification, User } from '../database/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>
  ) {}

  async create(params: {
    title: string;
    message: string;
    recipientRole?: string;
    recipientId?: string;
    entityType?: string;
    entityId?: string;
  }) {
    const notification = this.notificationRepo.create({
      title: params.title,
      message: params.message,
      recipientRole: params.recipientRole,
      recipientId: params.recipientId,
      entityType: params.entityType,
      entityId: params.entityId,
      isRead: false
    });
    return this.notificationRepo.save(notification);
  }

  async findForUser(user: User) {
    const roles = user.roles.map((r) => r.name);
    const where: any[] = [
      { recipientId: user.id },
      { recipientId: IsNull(), recipientRole: IsNull() }
    ];
    if (roles.length > 0) {
      where.push({ recipientRole: In(roles) });
    }
    // Find notifications sent to:
    // 1. Everyone (recipientRole and recipientId are null)
    // 2. This user's roles
    // 3. This user's ID
    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async markRead(id: string, user: User) {
    const notification = await this.notificationRepo.findOneBy({ id });
    if (!notification) throw new NotFoundException('Notification not found');

    const userRoles = new Set(user.roles.map((r) => r.name));
    const isBroadcast = !notification.recipientId && !notification.recipientRole;
    const isRecipientUser = notification.recipientId === user.id;
    const isRecipientRole = Boolean(notification.recipientRole && userRoles.has(notification.recipientRole));

    if (!isBroadcast && !isRecipientUser && !isRecipientRole) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }
}
