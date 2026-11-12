import { Controller, Get, Post, Body } from '@nestjs/common';
import { QualityService } from './quality.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, QAStatus } from '../database/entities';

@Controller('quality')
export class QualityController {
  constructor(private service: QualityService) {}

  @Get('inspections')
  @RequirePermissions('REPORT_VIEW')
  async getInspections() {
    return this.service.findInspections();
  }

  @Get('defects')
  @RequirePermissions('REPORT_VIEW')
  async getDefects() {
    return this.service.getDefects();
  }

  @Post('inspections')
  @RequirePermissions('REPORT_VIEW') // QA role or Supervisor
  async createInspection(
    @CurrentUser() user: User,
    @Body() dto: {
      productId: string;
      workOrderId?: string;
      goodsReceiptId?: string;
      batchNo: string;
      weight?: number;
      size?: number;
      color?: string;
      temperature?: number;
      defectDetails?: string;
      status: QAStatus;
      comment: string;
      defectsList?: Array<{ defectType: string; severity: number; description?: string }>;
    }
  ) {
    return this.service.createInspection(user, dto);
  }
}
