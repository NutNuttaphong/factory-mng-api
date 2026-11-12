export declare class Category {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
}
export declare class Unit {
    id: string;
    name: string;
    createdAt: Date;
}
export declare class Supplier {
    id: string;
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    createdAt: Date;
}
export declare class Customer {
    id: string;
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    createdAt: Date;
}
export declare class Warehouse {
    id: string;
    code: string;
    name: string;
    location: string;
    locations: WarehouseLocation[];
    createdAt: Date;
}
export declare class WarehouseLocation {
    id: string;
    code: string;
    warehouse: Warehouse;
    createdAt: Date;
}
export declare enum ProductType {
    RAW_MATERIAL = "RAW_MATERIAL",
    PACKAGING = "PACKAGING",
    SEMI_FINISHED = "SEMI_FINISHED",
    FINISHED_GOOD = "FINISHED_GOOD"
}
export declare class Product {
    id: string;
    code: string;
    name: string;
    category: Category | null;
    type: ProductType;
    unit: Unit | null;
    cost: number;
    price: number;
    minimumStock: number;
    maximumStock: number;
    warehouse: Warehouse | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
