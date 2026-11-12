import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock, StockMovement, StockMovementType } from '../database/entities/purchasing-inventory.entity';
import { Product, Warehouse } from '../database/entities/master.entity';
import { User } from '../database/entities/rbac.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    private notificationsService: NotificationsService,
    private auditService: AuditService
  ) {}

  async getStockOverview() {
    return this.stockRepo.find({
      relations: { product: { category: true, unit: true }, warehouse: true },
      order: { product: { code: 'ASC' } }
    });
  }

  async getMovements() {
    return this.movementRepo.find({
      relations: { product: true, fromWarehouse: true, toWarehouse: true, user: true },
      order: { createdAt: 'DESC' }
    });
  }

  async stockIn(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    user: User
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');

    const product = await this.productRepo.findOneBy({ id: productId });
    const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });

    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    let stock = await this.stockRepo.findOne({
      where: { product: { id: productId }, warehouse: { id: warehouseId } }
    });

    if (!stock) {
      stock = this.stockRepo.create({
        product,
        warehouse,
        quantity: 0,
        status: 'OUT'
      });
    }

    stock.quantity += quantity;
    stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
    await this.stockRepo.save(stock);

    // Save movement transaction
    const movement = this.movementRepo.create({
      type: StockMovementType.STOCK_IN,
      product,
      toWarehouse: warehouse,
      quantity,
      referenceType,
      referenceId,
      user
    });
    await this.movementRepo.save(movement);

    // Log to Audit Log
    await this.auditService.log({
      action: 'STOCK_IN',
      entityName: 'Stock',
      entityId: stock.id,
      afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
      userEmail: user.email
    });

    await this.checkLowStockAlert(product, stock.quantity);
    return stock;
  }

  async stockOut(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    user: User
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');

    const product = await this.productRepo.findOneBy({ id: productId });
    const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });

    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    const stock = await this.stockRepo.findOne({
      where: { product: { id: productId }, warehouse: { id: warehouseId } }
    });

    if (!stock || stock.quantity < quantity) {
      throw new BadRequestException(`Insufficient stock for product ${product.code} in warehouse ${warehouse.code}`);
    }

    stock.quantity -= quantity;
    stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
    await this.stockRepo.save(stock);

    // Save movement transaction
    const movement = this.movementRepo.create({
      type: StockMovementType.STOCK_OUT,
      product,
      fromWarehouse: warehouse,
      quantity,
      referenceType,
      referenceId,
      user
    });
    await this.movementRepo.save(movement);

    // Log to Audit Log
    await this.auditService.log({
      action: 'STOCK_OUT',
      entityName: 'Stock',
      entityId: stock.id,
      afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
      userEmail: user.email
    });

    await this.checkLowStockAlert(product, stock.quantity);
    return stock;
  }

  async transfer(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    user: User
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
    if (fromWarehouseId === toWarehouseId) throw new BadRequestException('Source and target warehouses cannot be the same');

    const product = await this.productRepo.findOneBy({ id: productId });
    const fromWh = await this.warehouseRepo.findOneBy({ id: fromWarehouseId });
    const toWh = await this.warehouseRepo.findOneBy({ id: toWarehouseId });

    if (!product || !fromWh || !toWh) throw new NotFoundException('Product, source or target warehouse not found');

    const sourceStock = await this.stockRepo.findOne({
      where: { product: { id: productId }, warehouse: { id: fromWarehouseId } }
    });

    if (!sourceStock || sourceStock.quantity < quantity) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    // Deduct source
    sourceStock.quantity -= quantity;
    sourceStock.status = this.computeStockStatus(sourceStock.quantity, product.minimumStock);
    await this.stockRepo.save(sourceStock);

    // Add target
    let targetStock = await this.stockRepo.findOne({
      where: { product: { id: productId }, warehouse: { id: toWarehouseId } }
    });
    if (!targetStock) {
      targetStock = this.stockRepo.create({
        product,
        warehouse: toWh,
        quantity: 0,
        status: 'OUT'
      });
    }
    targetStock.quantity += quantity;
    targetStock.status = this.computeStockStatus(targetStock.quantity, product.minimumStock);
    await this.stockRepo.save(targetStock);

    // Save movement transaction
    const movement = this.movementRepo.create({
      type: StockMovementType.TRANSFER,
      product,
      fromWarehouse: fromWh,
      toWarehouse: toWh,
      quantity,
      referenceType: 'TRANSFER',
      user
    });
    await this.movementRepo.save(movement);

    // Audit logs
    await this.auditService.log({
      action: 'STOCK_TRANSFER',
      entityName: 'Stock',
      entityId: product.id,
      afterState: { quantityTransfered: quantity, from: fromWh.code, to: toWh.code },
      userEmail: user.email
    });

    await this.checkLowStockAlert(product, sourceStock.quantity);
    return { sourceStock, targetStock };
  }

  async adjust(
    productId: string,
    warehouseId: string,
    newQuantity: number,
    user: User
  ) {
    if (newQuantity < 0) throw new BadRequestException('Stock quantity cannot be negative');

    const product = await this.productRepo.findOneBy({ id: productId });
    const warehouse = await this.warehouseRepo.findOneBy({ id: warehouseId });

    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    let stock = await this.stockRepo.findOne({
      where: { product: { id: productId }, warehouse: { id: warehouseId } }
    });

    const beforeQty = stock ? stock.quantity : 0;
    const difference = newQuantity - beforeQty;

    if (difference === 0) return stock; // No change

    if (!stock) {
      stock = this.stockRepo.create({
        product,
        warehouse,
        quantity: 0,
        status: 'OUT'
      });
    }

    stock.quantity = newQuantity;
    stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
    await this.stockRepo.save(stock);

    // Save movement transaction
    const movement = this.movementRepo.create({
      type: StockMovementType.ADJUSTMENT,
      product,
      fromWarehouse: difference < 0 ? warehouse : null,
      toWarehouse: difference > 0 ? warehouse : null,
      quantity: Math.abs(difference),
      referenceType: 'MANUAL_ADJUST',
      user
    });
    await this.movementRepo.save(movement);

    // Save Audit log with before/after changes as requested
    await this.auditService.log({
      action: 'UPDATE_PRODUCT_STOCK',
      entityName: 'Stock',
      entityId: stock.id,
      beforeState: { quantity: beforeQty },
      afterState: { quantity: newQuantity, adjustedDiff: difference },
      userEmail: user.email
    });

    await this.checkLowStockAlert(product, stock.quantity);
    return stock;
  }

  private computeStockStatus(qty: number, minStock: number): string {
    if (qty <= 0) return 'OUT';
    if (qty < minStock) return 'LOW';
    return 'NORMAL';
  }

  private async checkLowStockAlert(product: Product, quantity: number) {
    if (quantity <= product.minimumStock) {
      const typeStr = quantity === 0 ? 'out of stock' : 'below minimum stock limit';
      await this.notificationsService.create({
        title: 'Stock Level Alert',
        message: `Material ${product.code} (${product.name}) is ${typeStr}. Current: ${quantity} ${product.unit?.name || 'units'}, Min: ${product.minimumStock}`,
        recipientRole: 'Warehouse',
        entityType: 'STOCK',
        entityId: product.id
      });
    }
  }
}
