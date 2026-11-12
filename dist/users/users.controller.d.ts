import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("../database/entities").User[]>;
    getRoles(): Promise<import("../database/entities").Role[]>;
    getPermissions(): Promise<import("../database/entities").Permission[]>;
    findOne(id: string): Promise<import("../database/entities").User>;
    create(dto: {
        email: string;
        password?: string;
        fullName: string;
        roleNames: string[];
    }): Promise<import("../database/entities").User>;
    update(id: string, dto: {
        email?: string;
        password?: string;
        fullName?: string;
        roleNames?: string[];
        isActive?: boolean;
    }): Promise<import("../database/entities").User>;
    remove(id: string): Promise<import("../database/entities").User>;
}
