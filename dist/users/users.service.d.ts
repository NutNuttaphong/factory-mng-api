import { Repository } from 'typeorm';
import { User, Role, Permission } from '../database/entities';
export declare class UsersService {
    private userRepo;
    private roleRepo;
    private permRepo;
    constructor(userRepo: Repository<User>, roleRepo: Repository<Role>, permRepo: Repository<Permission>);
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    create(dto: {
        email: string;
        password?: string;
        fullName: string;
        roleNames: string[];
    }): Promise<User>;
    update(id: string, dto: {
        email?: string;
        password?: string;
        fullName?: string;
        roleNames?: string[];
        isActive?: boolean;
    }): Promise<User>;
    remove(id: string): Promise<User>;
    getRoles(): Promise<Role[]>;
    getPermissions(): Promise<Permission[]>;
}
