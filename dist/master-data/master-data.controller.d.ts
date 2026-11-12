import { MasterDataService } from './master-data.service';
import { ProductType } from '../database/entities';
export declare class MasterDataController {
    private service;
    constructor(service: MasterDataService);
    getProducts(): Promise<import("../database/entities").Product[]>;
    getProduct(id: string): Promise<import("../database/entities").Product>;
    createProduct(dto: {
        code: string;
        name: string;
        categoryId: string;
        type: ProductType;
        unitId: string;
        cost: number;
        price: number;
        minimumStock: number;
        maximumStock: number;
        warehouseId?: string;
    }): Promise<import("../database/entities").Product>;
    updateProduct(id: string, dto: any): Promise<import("../database/entities").Product>;
    deleteProduct(id: string): Promise<import("../database/entities").Product>;
    getCategories(): Promise<import("../database/entities").Category[]>;
    createCategory(body: {
        name: string;
        description?: string;
    }): Promise<import("../database/entities").Category>;
    getUnits(): Promise<import("../database/entities").Unit[]>;
    createUnit(body: {
        name: string;
    }): Promise<import("../database/entities").Unit>;
    getSuppliers(): Promise<import("../database/entities").Supplier[]>;
    createSupplier(dto: any): Promise<import("../database/entities").Supplier[]>;
    updateSupplier(id: string, dto: any): Promise<import("../database/entities").Supplier>;
    getCustomers(): Promise<import("../database/entities").Customer[]>;
    createCustomer(dto: any): Promise<import("../database/entities").Customer[]>;
    updateCustomer(id: string, dto: any): Promise<import("../database/entities").Customer>;
    getWarehouses(): Promise<import("../database/entities").Warehouse[]>;
    createWarehouse(dto: {
        code: string;
        name: string;
        location?: string;
        locations?: string[];
    }): Promise<import("../database/entities").Warehouse[]>;
}
