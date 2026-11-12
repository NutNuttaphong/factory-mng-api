import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';
import {
  Product,
  Category,
  Unit,
  Supplier,
  Customer,
  Warehouse,
  WarehouseLocation,
  Stock
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Category,
      Unit,
      Supplier,
      Customer,
      Warehouse,
      WarehouseLocation,
      Stock
    ])
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
