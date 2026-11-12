import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MongoWakeupMiddleware } from './database/mongo-wakeup.middleware';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { UsersModule } from './users/users.module';
import { MasterDataModule } from './master-data/master-data.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ProductionModule } from './production/production.module';
import { QualityModule } from './quality/quality.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    MasterDataModule,
    AuditModule,
    NotificationsModule,
    InventoryModule,
    PurchasingModule,
    ProductionModule,
    QualityModule,
    SalesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MongoWakeupMiddleware).forRoutes('{*path}');
  }
}
