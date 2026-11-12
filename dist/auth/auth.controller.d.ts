import { AuthService } from './auth.service';
import { User } from '../database/entities';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: any;
    }): Promise<{
        accessToken: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            roles: string[];
            permissions: string[];
        };
    }>;
    refresh(): Promise<{
        status: string;
        message: string;
    }>;
    logout(): Promise<{
        status: string;
        message: string;
    }>;
    me(user: User): Promise<{
        id: string;
        email: string;
        fullName: string;
        roles: string[];
        permissions: string[];
    }>;
}
