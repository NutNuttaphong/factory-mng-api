import { Controller, Get, Post, Body } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { QualityService } from './quality.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, QAStatus } from '../database/entities';

class QualityDefectDto {
  @IsString()
  @IsNotEmpty()
  defectType: string;

  @IsInt()
  @Min(1)
  @Max(5)
  severity: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class CreateInspectionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  goodsReceiptId?: string;

  @IsString()
  @IsNotEmpty()
  batchNo: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsString()
  defectDetails?: string;

  @IsEnum(QAStatus)
  status: QAStatus;

  @IsOptional()
  @IsString()
  comment: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityDefectDto)
  defectsList?: QualityDefectDto[];
}

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
    @Body() dto: CreateInspectionDto
  ) {
    return this.service.createInspection(user, { ...dto, comment: dto.comment || '' });
  }
}
