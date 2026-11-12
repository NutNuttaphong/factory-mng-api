import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './rbac.entity';
import { Product } from './master.entity';
import { WorkOrder } from './production.entity';
import { GoodsReceipt } from './purchasing-inventory.entity';

export enum QAStatus {
  PASS = 'PASS',
  FAIL = 'FAIL',
  REWORK = 'REWORK',
}

@Entity('quality_inspections')
export class QualityInspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // e.g. QA-2026-00001

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => WorkOrder, { nullable: true, eager: true })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder | null;

  @ManyToOne(() => GoodsReceipt, { nullable: true, eager: true })
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt | null;

  @Column({ nullable: true })
  batchNo: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'inspector_id' })
  inspector: User;

  // Quantitative measurements
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  size: number | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  temperature: number | null;

  @Column({ type: 'text', nullable: true })
  defectDetails: string | null;

  @Column({ type: 'varchar', default: QAStatus.PASS })
  status: QAStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('quality_defects')
export class QualityDefect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => QualityInspection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection: QualityInspection;

  @Column()
  defectType: string; // e.g. CRACK, COLOR_MISMATCH, UNDERWEIGHT

  @Column({ type: 'integer', default: 1 })
  severity: number; // 1 to 5

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
