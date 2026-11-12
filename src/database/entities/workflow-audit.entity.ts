import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User, Role } from './rbac.entity';

// --- APPROVAL WORKFLOWS ---

@Entity('approval_workflows')
export class ApprovalWorkflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  targetType: string; // e.g. PURCHASE_REQUEST, PURCHASE_ORDER

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  minAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  maxAmount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('approval_steps')
export class ApprovalStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ApprovalWorkflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: ApprovalWorkflow;

  @Column({ type: 'integer' })
  stepOrder: number; // 1, 2, 3

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role; // Role that needs to approve this step (e.g. Manager, Director, Finance)
}

@Entity('approval_histories')
export class ApprovalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // e.g. PURCHASE_REQUEST, PURCHASE_ORDER

  @Column()
  entityId: string; // ID of the request or order

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User; // Who approved/rejected

  @Column()
  action: string; // e.g. SUBMIT, APPROVE, REJECT, CANCEL

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  previousStatus: string;

  @Column({ nullable: true })
  newStatus: string;

  @CreateDateColumn()
  createdAt: Date;
}


// --- AUDIT LOGS ---

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  userEmail: string | null;

  @Column({ type: 'varchar' })
  action: string; // e.g. CREATE_PRODUCT, UPDATE_PRODUCT

  @Column()
  entityName: string; // e.g. Product, Stock

  @Column()
  entityId: string;

  @Column({ type: 'text', nullable: true })
  beforeState: string | null; // JSON string of old fields

  @Column({ type: 'text', nullable: true })
  afterState: string | null; // JSON string of new fields

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}


// --- NOTIFICATIONS ---

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  recipientRole: string; // Broadcast to a role (e.g. QA, Manager, Warehouse)

  @Column({ nullable: true })
  recipientId: string; // Send to a specific User ID

  @Column({ nullable: true })
  entityType: string; // e.g. PURCHASE_REQUEST, STOCK, QUALITY_INSPECTION

  @Column({ nullable: true })
  entityId: string;

  @CreateDateColumn()
  createdAt: Date;
}
