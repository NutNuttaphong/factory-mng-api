import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, User, extractUserAccess, isValidObjectId } from '../database/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async create(params: {
    title: string;
    message: string;
    recipientRole?: string;
    recipientId?: string;
    entityType?: string;
    entityId?: string;
  }) {
    return this.notificationModel.create({
      title: params.title,
      message: params.message,
      recipientRole: params.recipientRole ?? null,
      recipientId: params.recipientId ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      isRead: false,
    });
  }

  async findForUser(user: User) {
    const { roleNames: roles } = extractUserAccess(user);
    const orFilters: Record<string, any>[] = [
      { recipientId: user.id },
      { recipientId: null, recipientRole: null },
    ];
    if (roles.length > 0) {
      orFilters.push({ recipientRole: { $in: roles } });
    }
    return this.notificationModel
      .find({ $or: orFilters })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markRead(id: string, user: User) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Notification not found');
    }

    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) throw new NotFoundException('Notification not found');

    const userRoles = new Set(extractUserAccess(user).roleNames);
    const isBroadcast = !notification.recipientId && !notification.recipientRole;
    const isRecipientUser = notification.recipientId === user.id;
    const isRecipientRole = Boolean(
      notification.recipientRole && userRoles.has(notification.recipientRole),
    );

    if (!isBroadcast && !isRecipientUser && !isRecipientRole) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }
}
