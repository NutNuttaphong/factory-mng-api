import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Stock, StockMovement, Product, Warehouse } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockMovement, Product, Warehouse])
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
