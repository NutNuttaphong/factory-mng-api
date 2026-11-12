import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/workflow-audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>
  ) {}

  async log(params: {
    action: string;
    entityName: string;
    entityId: string;
    beforeState?: any;
    afterState?: any;
    userEmail?: string;
    ipAddress?: string;
  }) {
    const beforeStr = params.beforeState ? JSON.stringify(params.beforeState) : null;
    const afterStr = params.afterState ? JSON.stringify(params.afterState) : null;

    const logEntry = this.auditRepo.create({
      action: params.action,
      entityName: params.entityName,
      entityId: params.entityId,
      beforeState: beforeStr,
      afterState: afterStr,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress || '127.0.0.1'
    });

    return this.auditRepo.save(logEntry);
  }

  async findAll() {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' }
    });
  }
}
