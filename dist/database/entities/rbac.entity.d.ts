export declare class Permission {
    id: string;
    code: string;
    description: string;
    createdAt: Date;
}
export declare class Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    isActive: boolean;
    roles: Role[];
    createdAt: Date;
    updatedAt: Date;
}
