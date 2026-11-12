import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './rbac.entity';
import { Product, Supplier, Warehouse } from './master.entity';

// --- PURCHASING ---

export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. PR-2026-00001

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ type: 'varchar', default: ApprovalStatus.DRAFT })
  status: ApprovalStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => PurchaseRequestItem, (item) => item.purchaseRequest, { cascade: true, eager: true })
  items: PurchaseRequestItem[];

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('purchase_request_items')
export class PurchaseRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PurchaseRequest, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_request_id' })
  purchaseRequest: PurchaseRequest;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimatedPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. PO-2026-00001

  @ManyToOne(() => Supplier, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column({ type: 'varchar', default: ApprovalStatus.DRAFT })
  status: ApprovalStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true, eager: true })
  items: PurchaseOrderItem[];

  @ManyToOne(() => PurchaseRequest, { nullable: true })
  @JoinColumn({ name: 'purchase_request_id' })
  purchaseRequest: PurchaseRequest;

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;
}

export enum GoodsReceiptStatus {
  PENDING_QA = 'PENDING_QA',
  QA_PASSED = 'QA_PASSED',
  QA_FAILED = 'QA_FAILED',
  STOCKED = 'STOCKED',
}

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. GR-2026-00001

  @ManyToOne(() => PurchaseOrder, { eager: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy: User;

  @Column({ type: 'varchar', default: GoodsReceiptStatus.PENDING_QA })
  status: GoodsReceiptStatus;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt, { cascade: true, eager: true })
  items: GoodsReceiptItem[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GoodsReceipt, (gr) => gr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  quantityReceived: number;

  @Column({ type: 'integer', default: 0 })
  quantityAccepted: number;

  @Column({ type: 'integer', default: 0 })
  quantityRejected: number;
}


// --- INVENTORY ---

@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'integer', default: 0 })
  quantity: number;

  // Dynamically computed or stored: NORMAL, LOW, OUT
  @Column({ default: 'NORMAL' })
  status: string;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum StockMovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  type: StockMovementType;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: 'from_warehouse_id' })
  fromWarehouse: Warehouse | null;

  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: 'to_warehouse_id' })
  toWarehouse: Warehouse | null;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ nullable: true })
  referenceType: string; // e.g. GOODS_RECEIPT, WORK_ORDER, SALES_ORDER, MANUAL_ADJUST

  @Column({ nullable: true })
  referenceId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}


// --- BILL OF MATERIALS (BOM) ---

@Entity('boms')
export class BOM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. BOM-001

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product; // Finished or Semi-finished product

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => BOMItem, (item) => item.bom, { cascade: true, eager: true })
  items: BOMItem[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('bom_items')
export class BOMItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BOM, (bom) => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom: BOM;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product; // Raw material, packaging, etc.

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantityNeeded: number; // Qty of component required for 1 unit of BOM's product
}
