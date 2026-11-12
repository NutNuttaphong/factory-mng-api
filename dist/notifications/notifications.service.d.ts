import { Repository } from 'typeorm';
import { Notification, User } from '../database/entities';
export declare class NotificationsService {
    private notificationRepo;
    constructor(notificationRepo: Repository<Notification>);
    create(params: {
        title: string;
        message: string;
        recipientRole?: string;
        recipientId?: string;
        entityType?: string;
        entityId?: string;
    }): Promise<Notification>;
    findForUser(user: User): Promise<Notification[]>;
    markRead(id: string): Promise<Notification>;
}
