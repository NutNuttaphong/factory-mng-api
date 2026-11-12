import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('REPORT_VIEW')
  async getDashboard() {
    return this.service.getDashboardData();
  }
}
