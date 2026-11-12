import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../database/entities/rbac.entity';
export declare class AuthService {
    private userRepo;
    private jwtService;
    constructor(userRepo: Repository<User>, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            roles: string[];
            permissions: string[];
        };
    }>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        roles: string[];
        permissions: string[];
    }>;
}
