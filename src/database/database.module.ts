import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as entities from './entities';
import { DatabaseSeedService } from './database-seed.service';

const entityArray = Object.values(entities).filter(
  (val) => typeof val === 'function',
);

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbType = configService.get<string>('DB_TYPE', 'sqlite');

        if (dbType === 'postgres') {
          return {
            type: 'postgres',
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: configService.get<number>('DB_PORT', 5432),
            username: configService.get<string>('DB_USERNAME', 'postgres'),
            password: configService.get<string>('DB_PASSWORD', 'postgres'),
            database: configService.get<string>('DB_DATABASE', 'factory_mng'),
            entities: entityArray,
            synchronize: true, // Only for development; use migrations for production
          } as any;
        }

        return {
          type: 'sqljs',
          location: configService.get<string>('DB_NAME', 'db.sqlite'),
          autoSave: true,
          entities: entityArray,
          synchronize: true,
        } as any;
      },
    }),
    TypeOrmModule.forFeature(entityArray),
  ],
  providers: [DatabaseSeedService],
  exports: [TypeOrmModule, DatabaseSeedService],
})
export class DatabaseModule {}
