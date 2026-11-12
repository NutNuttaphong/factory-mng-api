import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions('USER_VIEW') // Admin or Super Admin usually
  async findAll() {
    return this.auditService.findAll();
  }
}
