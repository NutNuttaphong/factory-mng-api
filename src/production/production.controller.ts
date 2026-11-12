import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { ProductionService } from './production.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

class BomItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantityNeeded: number;
}

class CreateBomDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items: BomItemDto[];
}

class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  targetQuantity: number;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;
}

class CreateWorkOrderDto {
  @IsOptional()
  @IsString()
  productionPlanId?: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  assignedToId: string;
}

class IssueMaterialsDto {
  @IsString()
  @IsNotEmpty()
  warehouseId: string;
}

class ReportProductionResultDto {
  @IsNumber()
  @Min(0)
  qtyProduced: number;

  @IsNumber()
  @Min(0)
  qtyDefective: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('production')
export class ProductionController {
  constructor(private service: ProductionService) {}

  // --- BILL OF MATERIALS (BOM) ---

  @Get('boms')
  @RequirePermissions('PRODUCT_VIEW')
  async getBOMs() {
    return this.service.findBOMs();
  }

  @Post('boms')
  @RequirePermissions('PRODUCT_CREATE')
  async createBOM(@Body() dto: CreateBomDto) {
    return this.service.createBOM(dto);
  }

  // --- PLANS ---

  @Get('plans')
  @RequirePermissions('PRODUCTION_CREATE')
  async getPlans() {
    return this.service.findPlans();
  }

  @Post('plans')
  @RequirePermissions('PRODUCTION_CREATE')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.service.createPlan(dto);
  }

  // --- WORK ORDERS (WO) ---

  @Get('orders')
  @RequirePermissions('PRODUCT_VIEW')
  async getWorkOrders() {
    return this.service.findWorkOrders();
  }

  @Post('orders')
  @RequirePermissions('PRODUCTION_CREATE')
  async createWorkOrder(@Body() dto: CreateWorkOrderDto) {
    return this.service.createWorkOrder(dto);
  }

  @Get('orders/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getWorkOrder(@Param('id') id: string) {
    return this.service.findWorkOrder(id);
  }

  @Get('orders/:id/requirements')
  @RequirePermissions('PRODUCT_VIEW')
  async checkRequirements(@Param('id') id: string) {
    return this.service.checkMaterialRequirement(id);
  }

  @Post('orders/:id/issue')
  @RequirePermissions('PRODUCTION_CREATE')
  async issueMaterials(
    @Param('id') id: string,
    @Body() body: IssueMaterialsDto,
    @CurrentUser() user: User
  ) {
    return this.service.issueMaterials(id, body.warehouseId, user);
  }

  @Patch('orders/:id/start')
  @RequirePermissions('PRODUCTION_CREATE')
  async startProduction(@Param('id') id: string) {
    return this.service.startProduction(id);
  }

  @Post('orders/:id/result')
  @RequirePermissions('PRODUCTION_CREATE')
  async reportResult(
    @Param('id') id: string,
    @Body() body: ReportProductionResultDto,
    @CurrentUser() user: User
  ) {
    return this.service.reportResult(id, body.qtyProduced, body.qtyDefective, body.notes || '', user);
  }
}
