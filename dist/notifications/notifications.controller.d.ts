import { NotificationsService } from './notifications.service';
import { User } from '../database/entities';
export declare class NotificationsController {
    private service;
    constructor(service: NotificationsService);
    findAll(user: User): Promise<import("../database/entities").Notification[]>;
    markRead(id: string): Promise<import("../database/entities").Notification>;
}
