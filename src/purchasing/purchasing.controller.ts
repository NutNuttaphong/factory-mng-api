import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities';

@Controller('purchasing')
export class PurchasingController {
  constructor(private service: PurchasingService) {}

  // --- PURCHASE REQUESTS (PR) ---

  @Get('requests')
  @RequirePermissions('PRODUCT_VIEW') // Anyone with viewing access
  async getPRs() {
    return this.service.findPRs();
  }

  @Get('requests/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getPR(@Param('id') id: string) {
    return this.service.findPR(id);
  }

  @Post('requests')
  @RequirePermissions('PURCHASE_CREATE')
  async createPR(
    @CurrentUser() user: User,
    @Body() body: { items: Array<{ productId: string; quantity: number; estimatedPrice: number }> }
  ) {
    return this.service.createPR(user, body.items);
  }

  @Patch('requests/:id/submit')
  @RequirePermissions('PURCHASE_CREATE')
  async submitPR(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.submitPR(id, user);
  }

  @Patch('requests/:id/approve')
  @RequirePermissions('PURCHASE_APPROVE')
  async approvePR(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @CurrentUser() user: User
  ) {
    return this.service.approvePR(id, body.comment || 'Approved', user);
  }

  @Patch('requests/:id/reject')
  @RequirePermissions('PURCHASE_APPROVE')
  async rejectPR(
    @Param('id') id: string,
    @Body() body: { comment: string },
    @CurrentUser() user: User
  ) {
    return this.service.rejectPR(id, body.comment, user);
  }

  @Get('requests/:id/history')
  @RequirePermissions('PRODUCT_VIEW')
  async getHistory(@Param('id') id: string) {
    return this.service.getApprovalHistory('PURCHASE_REQUEST', id);
  }

  // --- PURCHASE ORDERS (PO) ---

  @Get('orders')
  @RequirePermissions('PRODUCT_VIEW')
  async getPOs() {
    return this.service.findPOs();
  }

  @Get('orders/:id')
  @RequirePermissions('PRODUCT_VIEW')
  async getPO(@Param('id') id: string) {
    return this.service.findPO(id);
  }

  // --- GOODS RECEIPTS (GR) ---

  @Get('receipts')
  @RequirePermissions('PRODUCT_VIEW')
  async getGRs() {
    return this.service.findGRs();
  }

  @Post('receipts')
  @RequirePermissions('PURCHASE_CREATE')
  async createGR(
    @CurrentUser() user: User,
    @Body() body: { poId: string; items: Array<{ productId: string; quantityReceived: number }> }
  ) {
    return this.service.createGR(body.poId, user.id, body.items);
  }
}
