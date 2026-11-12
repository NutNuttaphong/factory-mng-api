import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './rbac.entity';
import { Product, Warehouse } from './master.entity';

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_MATERIAL = 'PENDING_MATERIAL',
  MATERIAL_ISSUED = 'MATERIAL_ISSUED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PENDING_QA = 'PENDING_QA',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('production_plans')
export class ProductionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. PLN-2026-00001

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  targetQuantity: number;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, ACTIVE, COMPLETED, CANCELLED

  @OneToMany(() => WorkOrder, (wo) => wo.productionPlan)
  workOrders: WorkOrder[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. WO-2026-00001

  @ManyToOne(() => ProductionPlan, (plan) => plan.workOrders, { nullable: true })
  @JoinColumn({ name: 'production_plan_id' })
  productionPlan: ProductionPlan | null;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', default: WorkOrderStatus.DRAFT })
  status: WorkOrderStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('material_issues')
export class MaterialIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. MI-2026-00001

  @ManyToOne(() => WorkOrder, { eager: true })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse; // Warehouse from which materials are drawn

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'issued_by_id' })
  issuedBy: User;

  @Column({ type: 'simple-json', nullable: true })
  items: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantityRequired: number;
    quantityIssued: number;
  }>;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('production_results')
export class ProductionResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. PRR-2026-00001

  @ManyToOne(() => WorkOrder, { eager: true })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ type: 'integer' })
  quantityProduced: number;

  @Column({ type: 'integer', default: 0 })
  quantityDefective: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
