import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Stock,
  StockMovement,
  StockMovementType,
  Product,
  Warehouse,
  User,
  isValidObjectId,
  refId,
  asDoc,
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
    @InjectModel(StockMovement.name) private movementModel: Model<StockMovement>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<Warehouse>,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async getStockOverview() {
    const stocks = await this.stockModel
      .find()
      .populate({ path: 'product', populate: ['category', 'unit'] })
      .populate('warehouse')
      .exec();
    return stocks.sort((a, b) =>
      (asDoc(a.product)?.code || '').localeCompare(asDoc(b.product)?.code || ''),
    );
  }

  async getMovements() {
    return this.movementModel
      .find()
      .populate(['product', 'fromWarehouse', 'toWarehouse', 'user'])
      .sort({ createdAt: -1 })
      .exec();
  }

  async stockIn(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    user: User,
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
    if (!isValidObjectId(productId) || !isValidObjectId(warehouseId)) {
      throw new NotFoundException('Product or Warehouse not found');
    }

    const [product, warehouse] = await Promise.all([
      this.productModel.findById(productId).populate('unit').exec(),
      this.warehouseModel.findById(warehouseId).exec(),
    ]);
    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    const stock = await this.stockModel
      .findOneAndUpdate(
        { product: product._id, warehouse: warehouse._id },
        { $inc: { quantity } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
    await stock.save();

    await this.movementModel.create({
      type: StockMovementType.STOCK_IN,
      product: product._id,
      toWarehouse: warehouse._id,
      quantity,
      referenceType,
      referenceId,
      user: refId(user),
    });

    await this.auditService.log({
      action: 'STOCK_IN',
      entityName: 'Stock',
      entityId: stock.id,
      afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
      userEmail: user.email,
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
    user: User,
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
    if (!isValidObjectId(productId) || !isValidObjectId(warehouseId)) {
      throw new NotFoundException('Product or Warehouse not found');
    }

    const [product, warehouse] = await Promise.all([
      this.productModel.findById(productId).populate('unit').exec(),
      this.warehouseModel.findById(warehouseId).exec(),
    ]);
    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    const stock = await this.stockModel
      .findOneAndUpdate(
        { product: product._id, warehouse: warehouse._id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      )
      .exec();

    if (!stock) {
      throw new BadRequestException(
        `Insufficient stock for product ${product.code} in warehouse ${warehouse.code}`,
      );
    }

    stock.status = this.computeStockStatus(stock.quantity, product.minimumStock);
    await stock.save();

    await this.movementModel.create({
      type: StockMovementType.STOCK_OUT,
      product: product._id,
      fromWarehouse: warehouse._id,
      quantity,
      referenceType,
      referenceId,
      user: refId(user),
    });

    await this.auditService.log({
      action: 'STOCK_OUT',
      entityName: 'Stock',
      entityId: stock.id,
      afterState: { quantity: stock.quantity, movementQty: quantity, ref: referenceType },
      userEmail: user.email,
    });

    await this.checkLowStockAlert(product, stock.quantity);
    return stock;
  }

  async transfer(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    user: User,
  ) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and target warehouses cannot be the same');
    }
    if (
      !isValidObjectId(productId) ||
      !isValidObjectId(fromWarehouseId) ||
      !isValidObjectId(toWarehouseId)
    ) {
      throw new NotFoundException('Product, source or target warehouse not found');
    }

    const [product, fromWh, toWh] = await Promise.all([
      this.productModel.findById(productId).populate('unit').exec(),
      this.warehouseModel.findById(fromWarehouseId).exec(),
      this.warehouseModel.findById(toWarehouseId).exec(),
    ]);
    if (!product || !fromWh || !toWh) {
      throw new NotFoundException('Product, source or target warehouse not found');
    }

    const sourceStock = await this.stockModel
      .findOneAndUpdate(
        { product: product._id, warehouse: fromWh._id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      )
      .exec();

    if (!sourceStock) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    sourceStock.status = this.computeStockStatus(sourceStock.quantity, product.minimumStock);
    await sourceStock.save();

    const targetStock = await this.stockModel
      .findOneAndUpdate(
        { product: product._id, warehouse: toWh._id },
        { $inc: { quantity } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    targetStock.status = this.computeStockStatus(targetStock.quantity, product.minimumStock);
    await targetStock.save();

    await this.movementModel.create({
      type: StockMovementType.TRANSFER,
      product: product._id,
      fromWarehouse: fromWh._id,
      toWarehouse: toWh._id,
      quantity,
      referenceType: 'TRANSFER',
      user: refId(user),
    });

    await this.auditService.log({
      action: 'STOCK_TRANSFER',
      entityName: 'Stock',
      entityId: product.id,
      afterState: { quantityTransfered: quantity, from: fromWh.code, to: toWh.code },
      userEmail: user.email,
    });

    await this.checkLowStockAlert(product, sourceStock.quantity);
    return { sourceStock, targetStock };
  }

  async adjust(productId: string, warehouseId: string, newQuantity: number, user: User) {
    if (newQuantity < 0) throw new BadRequestException('Stock quantity cannot be negative');
    if (!isValidObjectId(productId) || !isValidObjectId(warehouseId)) {
      throw new NotFoundException('Product or Warehouse not found');
    }

    const [product, warehouse] = await Promise.all([
      this.productModel.findById(productId).populate('unit').exec(),
      this.warehouseModel.findById(warehouseId).exec(),
    ]);
    if (!product || !warehouse) throw new NotFoundException('Product or Warehouse not found');

    let stock = await this.stockModel
      .findOne({ product: product._id, warehouse: warehouse._id })
      .exec();

    const beforeQty = stock ? stock.quantity : 0;
    const difference = newQuantity - beforeQty;
    if (difference === 0) return stock;

    const status = this.computeStockStatus(newQuantity, product.minimumStock);
    stock = await this.stockModel
      .findOneAndUpdate(
        { product: product._id, warehouse: warehouse._id },
        { $set: { quantity: newQuantity, status } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    await this.movementModel.create({
      type: StockMovementType.ADJUSTMENT,
      product: product._id,
      fromWarehouse: difference < 0 ? warehouse._id : null,
      toWarehouse: difference > 0 ? warehouse._id : null,
      quantity: Math.abs(difference),
      referenceType: 'MANUAL_ADJUST',
      user: refId(user),
    });

    await this.auditService.log({
      action: 'UPDATE_PRODUCT_STOCK',
      entityName: 'Stock',
      entityId: stock.id,
      beforeState: { quantity: beforeQty },
      afterState: { quantity: newQuantity, adjustedDiff: difference },
      userEmail: user.email,
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
        message: `Material ${product.code} (${product.name}) is ${typeStr}. Current: ${quantity} ${(product.unit ? asDoc(product.unit).name : undefined) || 'units'}, Min: ${product.minimumStock}`,
        recipientRole: 'Warehouse',
        entityType: 'STOCK',
        entityId: product.id,
      });
    }
  }
}
