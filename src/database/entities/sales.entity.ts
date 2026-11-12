import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './rbac.entity';
import { Customer, Product } from './master.entity';

export enum SalesOrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. SO-2026-00001

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson: User;

  @Column({ type: 'varchar', default: SalesOrderStatus.DRAFT })
  status: SalesOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => SalesOrderItem, (item) => item.salesOrder, { cascade: true, eager: true })
  items: SalesOrderItem[];

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('sales_order_items')
export class SalesOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SalesOrder, (so) => so.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'integer', default: 0 })
  quantityReserved: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. DLV-2026-00001

  @ManyToOne(() => SalesOrder, { eager: true })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'shipped_by_id' })
  shippedBy: User;

  @Column({ type: 'varchar', default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ type: 'date', nullable: true })
  deliveryDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
