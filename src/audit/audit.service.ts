import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from '../database/entities/workflow-audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
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

    return this.auditModel.create({
      action: params.action,
      entityName: params.entityName,
      entityId: params.entityId,
      beforeState: beforeStr,
      afterState: afterStr,
      userEmail: params.userEmail ?? null,
      ipAddress: params.ipAddress || '127.0.0.1',
    });
  }

  async findAll() {
    return this.auditModel.find().sort({ createdAt: -1 }).exec();
  }
}
