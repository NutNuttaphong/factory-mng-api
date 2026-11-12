import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SalesOrder,
  Delivery,
  SalesOrderStatus,
  DeliveryStatus,
  Product,
  Customer,
  User,
  Stock,
  isValidObjectId,
  refId,
  asDoc,
} from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(SalesOrder.name) private soModel: Model<SalesOrder>,
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async findOrders() {
    return this.soModel
      .find()
      .populate(['customer', 'salesperson'])
      .populate({ path: 'items.product', populate: { path: 'warehouse' } })
      .sort({ code: -1 })
      .exec();
  }

  async findOrder(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Sales Order not found');
    }
    const order = await this.soModel
      .findById(id)
      .populate(['customer', 'salesperson'])
      .populate({ path: 'items.product', populate: { path: 'warehouse' } })
      .exec();
    if (!order) throw new NotFoundException('Sales Order not found');
    return order;
  }

  async createOrder(
    user: User,
    customerId: string,
    itemsDto: Array<{ productId: string; quantity: number; price: number }>,
  ) {
    if (!Array.isArray(itemsDto) || itemsDto.length === 0) {
      throw new BadRequestException('Sales order must include at least one item');
    }

    for (const itemDto of itemsDto) {
      if (!Number.isFinite(itemDto.quantity) || itemDto.quantity <= 0) {
        throw new BadRequestException('Order item quantity must be greater than zero');
      }
      if (!Number.isFinite(itemDto.price) || itemDto.price < 0) {
        throw new BadRequestException('Order item price cannot be negative');
      }
    }

    if (!isValidObjectId(customerId)) {
      throw new NotFoundException('Customer not found');
    }
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) throw new NotFoundException('Customer not found');

    const orderCount = await this.soModel.countDocuments().exec();
    const code = `SO-2026-${String(orderCount + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const items: Array<{
      product: any;
      quantity: number;
      quantityReserved: number;
      price: number;
      totalPrice: number;
    }> = [];

    for (const itemDto of itemsDto) {
      if (!isValidObjectId(itemDto.productId)) {
        throw new NotFoundException(`Product ${itemDto.productId} not found`);
      }
      const product = await this.productModel.findById(itemDto.productId).exec();
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

      const totalPrice = itemDto.quantity * itemDto.price;
      totalAmount += totalPrice;

      items.push({
        product: product._id,
        quantity: itemDto.quantity,
        quantityReserved: 0,
        price: itemDto.price,
        totalPrice,
      });
    }

    const savedOrder = await this.soModel.create({
      code,
      customer: customer._id,
      salesperson: refId(user),
      status: SalesOrderStatus.DRAFT,
      totalAmount,
      items,
    });

    await this.auditService.log({
      action: 'CREATE_SALES_ORDER',
      entityName: 'SalesOrder',
      entityId: savedOrder.id,
      afterState: { code, totalAmount },
      userEmail: user.email,
    });

    return this.findOrder(savedOrder.id);
  }

  async reserveStock(orderId: string, user: User) {
    const order = await this.findOrder(orderId);
    if (order.status !== SalesOrderStatus.DRAFT && order.status !== SalesOrderStatus.PENDING) {
      throw new BadRequestException('Can only reserve stock for DRAFT or PENDING orders');
    }

    for (const item of order.items) {
      const stock = await this.stockModel.findOne({ product: refId(item.product) }).exec();
      const currentQty = stock ? stock.quantity : 0;
      if (currentQty < item.quantity) {
        order.status = SalesOrderStatus.PENDING;
        await order.save();
        throw new BadRequestException(
          `Insufficient stock for product ${asDoc(item.product).code}. Required: ${item.quantity}, Available: ${currentQty}`,
        );
      }
    }

    for (const item of order.items) {
      item.quantityReserved = item.quantity;
    }

    order.status = SalesOrderStatus.RESERVED;
    await order.save();

    await this.notificationsService.create({
      title: 'Stock Reserved',
      message: `Stock has been reserved for Sales Order ${order.code}. Ready for delivery.`,
      recipientRole: 'Warehouse',
      entityType: 'SALES_ORDER',
      entityId: order.id,
    });

    await this.auditService.log({
      action: 'RESERVE_SALES_STOCK',
      entityName: 'SalesOrder',
      entityId: order.id,
      afterState: { status: 'RESERVED' },
      userEmail: user.email,
    });

    return order;
  }

  async createDelivery(orderId: string, user: User) {
    const order = await this.findOrder(orderId);
    if (order.status !== SalesOrderStatus.RESERVED) {
      throw new BadRequestException('Can only ship items for a RESERVED Sales Order');
    }

    const deliveryCount = await this.deliveryModel.countDocuments().exec();
    const code = `DLV-2026-${String(deliveryCount + 1).padStart(5, '0')}`;

    for (const item of order.items) {
      const prod = asDoc(item.product);
      const whId = prod.warehouse ? asDoc(prod.warehouse).id : undefined;
      if (!whId) {
        throw new BadRequestException(`No warehouse assigned to product ${prod.code}`);
      }

      await this.inventoryService.stockOut(
        prod.id,
        whId,
        item.quantity,
        'SALES_DELIVERY',
        order.id,
        user,
      );
    }

    const delivery = await this.deliveryModel.create({
      code,
      salesOrder: order._id,
      shippedBy: refId(user),
      status: DeliveryStatus.DELIVERED,
      deliveryDate: new Date(),
    });

    order.status = SalesOrderStatus.DELIVERED;
    await order.save();

    await this.notificationsService.create({
      title: 'Sales Order Delivered',
      message: `Sales Order ${order.code} has been delivered successfully.`,
      recipientRole: 'Sales',
      entityType: 'SALES_ORDER',
      entityId: order.id,
    });

    await this.auditService.log({
      action: 'DELIVER_SALES_ORDER',
      entityName: 'Delivery',
      entityId: delivery.id,
      afterState: { code, status: 'DELIVERED' },
      userEmail: user.email,
    });

    return this.deliveryModel
      .findById(delivery.id)
      .populate({ path: 'salesOrder', populate: { path: 'customer' } })
      .populate('shippedBy')
      .exec();
  }

  async findDeliveries() {
    return this.deliveryModel
      .find()
      .populate({ path: 'salesOrder', populate: { path: 'customer' } })
      .populate('shippedBy')
      .sort({ code: -1 })
      .exec();
  }
}
