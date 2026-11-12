import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import {
  Category,
  CategorySchema,
  Unit,
  UnitSchema,
  Supplier,
  SupplierSchema,
  Customer,
  CustomerSchema,
  Warehouse,
  WarehouseSchema,
  Product,
  ProductSchema,
  Stock,
  StockSchema,
} from '../database/entities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Unit.name, schema: UnitSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Stock.name, schema: StockSchema },
    ]),
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
