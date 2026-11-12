import { Repository } from 'typeorm';
import { Category, Unit, Supplier, Customer, Warehouse, WarehouseLocation, Product, ProductType } from '../database/entities/master.entity';
import { Stock } from '../database/entities/purchasing-inventory.entity';
export declare class MasterDataService {
    private productRepo;
    private categoryRepo;
    private unitRepo;
    private supplierRepo;
    private customerRepo;
    private whRepo;
    private locRepo;
    private stockRepo;
    constructor(productRepo: Repository<Product>, categoryRepo: Repository<Category>, unitRepo: Repository<Unit>, supplierRepo: Repository<Supplier>, customerRepo: Repository<Customer>, whRepo: Repository<Warehouse>, locRepo: Repository<WarehouseLocation>, stockRepo: Repository<Stock>);
    findProducts(): Promise<Product[]>;
    findProduct(id: string): Promise<Product>;
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
    }): Promise<Product>;
    updateProduct(id: string, dto: {
        name?: string;
        categoryId?: string;
        type?: ProductType;
        unitId?: string;
        cost?: number;
        price?: number;
        minimumStock?: number;
        maximumStock?: number;
        warehouseId?: string;
        status?: string;
    }): Promise<Product>;
    deleteProduct(id: string): Promise<Product>;
    findCategories(): Promise<Category[]>;
    createCategory(name: string, description?: string): Promise<Category>;
    findUnits(): Promise<Unit[]>;
    createUnit(name: string): Promise<Unit>;
    findSuppliers(): Promise<Supplier[]>;
    createSupplier(dto: any): Promise<Supplier[]>;
    updateSupplier(id: string, dto: any): Promise<Supplier>;
    findCustomers(): Promise<Customer[]>;
    createCustomer(dto: any): Promise<Customer[]>;
    updateCustomer(id: string, dto: any): Promise<Customer>;
    findWarehouses(): Promise<Warehouse[]>;
    createWarehouse(dto: {
        code: string;
        name: string;
        location?: string;
        locations?: string[];
    }): Promise<Warehouse[]>;
}
