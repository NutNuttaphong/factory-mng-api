import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SalesOrder,
  SalesOrderItem,
  Delivery,
  SalesOrderStatus,
  DeliveryStatus,
  Product,
  Customer,
  User,
  Stock
} from '../database/entities';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder) private soRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem) private soItemRepo: Repository<SalesOrderItem>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>,
    private inventoryService: InventoryService,
    private notificationsService: NotificationsService,
    private auditService: AuditService
  ) {}

  async findOrders() {
    return this.soRepo.find({
      relations: { customer: true, salesperson: true, items: { product: true } },
      order: { code: 'DESC' }
    });
  }

  async findOrder(id: string) {
    const order = await this.soRepo.findOne({
      where: { id },
      relations: { customer: true, salesperson: true, items: { product: true } }
    });
    if (!order) throw new NotFoundException('Sales Order not found');
    return order;
  }

  async createOrder(
    user: User,
    customerId: string,
    itemsDto: Array<{ productId: string; quantity: number; price: number }>
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

    const customer = await this.customerRepo.findOneBy({ id: customerId });
    if (!customer) throw new NotFoundException('Customer not found');

    const orderCount = await this.soRepo.count();
    const code = `SO-2026-${String(orderCount + 1).padStart(5, '0')}`;

    let totalAmount = 0;
    const items: SalesOrderItem[] = [];

    for (const itemDto of itemsDto) {
      const product = await this.productRepo.findOneBy({ id: itemDto.productId });
      if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);

      const totalPrice = itemDto.quantity * itemDto.price;
      totalAmount += totalPrice;

      const item = this.soItemRepo.create({
        product,
        quantity: itemDto.quantity,
        quantityReserved: 0,
        price: itemDto.price,
        totalPrice
      });
      items.push(item);
    }

    const order = this.soRepo.create({
      code,
      customer,
      salesperson: user,
      status: SalesOrderStatus.DRAFT,
      totalAmount,
      items
    });

    const savedOrder = await this.soRepo.save(order);

    await this.auditService.log({
      action: 'CREATE_SALES_ORDER',
      entityName: 'SalesOrder',
      entityId: savedOrder.id,
      afterState: { code, totalAmount },
      userEmail: user.email
    });

    return savedOrder;
  }

  async reserveStock(orderId: string, user: User) {
    const order = await this.findOrder(orderId);
    if (order.status !== SalesOrderStatus.DRAFT && order.status !== SalesOrderStatus.PENDING) {
      throw new BadRequestException('Can only reserve stock for DRAFT or PENDING orders');
    }

    // Check inventory for each item in the order
    for (const item of order.items) {
      // Find stock of product in any warehouse
      const stock = await this.stockRepo.findOne({
        where: { product: { id: item.product.id } } // Check product default warehouse
      });

      const currentQty = stock ? stock.quantity : 0;
      if (currentQty < item.quantity) {
        order.status = SalesOrderStatus.PENDING;
        await this.soRepo.save(order);
        throw new BadRequestException(
          `Insufficient stock for product ${item.product.code}. Required: ${item.quantity}, Available: ${currentQty}`
        );
      }
    }

    // Sufficent stock exists, reserve it
    for (const item of order.items) {
      item.quantityReserved = item.quantity;
      await this.soItemRepo.save(item);
    }

    order.status = SalesOrderStatus.RESERVED;
    const savedOrder = await this.soRepo.save(order);

    await this.notificationsService.create({
      title: 'Stock Reserved',
      message: `Stock has been reserved for Sales Order ${order.code}. Ready for delivery.`,
      recipientRole: 'Warehouse',
      entityType: 'SALES_ORDER',
      entityId: order.id
    });

    await this.auditService.log({
      action: 'RESERVE_SALES_STOCK',
      entityName: 'SalesOrder',
      entityId: order.id,
      afterState: { status: 'RESERVED' },
      userEmail: user.email
    });

    return savedOrder;
  }

  async createDelivery(orderId: string, user: User) {
    const order = await this.findOrder(orderId);
    if (order.status !== SalesOrderStatus.RESERVED) {
      throw new BadRequestException('Can only ship items for a RESERVED Sales Order');
    }

    const deliveryCount = await this.deliveryRepo.count();
    const code = `DLV-2026-${String(deliveryCount + 1).padStart(5, '0')}`;

    // Perform actual stock out from the inventory
    for (const item of order.items) {
      const whId = item.product.warehouse?.id;
      if (!whId) {
        throw new BadRequestException(`No warehouse assigned to product ${item.product.code}`);
      }

      await this.inventoryService.stockOut(
        item.product.id,
        whId,
        item.quantity,
        'SALES_DELIVERY',
        order.id,
        user
      );
    }

    const delivery = this.deliveryRepo.create({
      code,
      salesOrder: order,
      shippedBy: user,
      status: DeliveryStatus.DELIVERED,
      deliveryDate: new Date()
    });

    await this.deliveryRepo.save(delivery);

    order.status = SalesOrderStatus.DELIVERED;
    await this.soRepo.save(order);

    await this.notificationsService.create({
      title: 'Sales Order Delivered',
      message: `Sales Order ${order.code} has been delivered successfully.`,
      recipientRole: 'Sales',
      entityType: 'SALES_ORDER',
      entityId: order.id
    });

    await this.auditService.log({
      action: 'DELIVER_SALES_ORDER',
      entityName: 'Delivery',
      entityId: delivery.id,
      afterState: { code, status: 'DELIVERED' },
      userEmail: user.email
    });

    return delivery;
  }

  async findDeliveries() {
    return this.deliveryRepo.find({
      relations: { salesOrder: { customer: true }, shippedBy: true },
      order: { code: 'DESC' }
    });
  }
}
