import { User } from './rbac.entity';
import { Customer, Product } from './master.entity';
export declare enum SalesOrderStatus {
    DRAFT = "DRAFT",
    PENDING = "PENDING",
    RESERVED = "RESERVED",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED",
    CANCELLED = "CANCELLED"
}
export declare class SalesOrder {
    id: string;
    code: string;
    customer: Customer;
    salesperson: User;
    status: SalesOrderStatus;
    totalAmount: number;
    items: SalesOrderItem[];
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class SalesOrderItem {
    id: string;
    salesOrder: SalesOrder;
    product: Product;
    quantity: number;
    quantityReserved: number;
    price: number;
    totalPrice: number;
}
export declare enum DeliveryStatus {
    PENDING = "PENDING",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED",
    RETURNED = "RETURNED"
}
export declare class Delivery {
    id: string;
    code: string;
    salesOrder: SalesOrder;
    shippedBy: User;
    status: DeliveryStatus;
    deliveryDate: Date;
    createdAt: Date;
}
