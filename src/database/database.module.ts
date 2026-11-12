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
        const databaseUrl = configService.get<string>('DATABASE_URL')?.trim();
        const dbType = configService.get<string>('DB_TYPE', '').trim().toLowerCase();
        const usePostgres =
          dbType === 'postgres' ||
          Boolean(databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl));

        if (usePostgres) {
          const useSsl = configService.get<string>('DB_SSL', '').toLowerCase() === 'true';
          const basePostgres: Record<string, any> = {
            type: 'postgres',
            entities: entityArray,
            synchronize: true, // Note: switch to TypeORM migrations when schema stabilizes
          };

          if (useSsl) {
            basePostgres.ssl = { rejectUnauthorized: false };
          }

          if (databaseUrl) {
            return {
              ...basePostgres,
              url: databaseUrl,
            } as TypeOrmModuleOptions;
          }

          return {
            ...basePostgres,
            host: configService.get<string>('DB_HOST', 'localhost'),
            port: Number(configService.get<number>('DB_PORT', 5432)),
            username: configService.get<string>('DB_USERNAME', 'postgres'),
            password: configService.get<string>('DB_PASSWORD', 'postgres'),
            database: configService.get<string>('DB_DATABASE', 'factory_mng'),
          } as TypeOrmModuleOptions;
        }

        return {
          type: 'sqljs',
          location: configService.get<string>('DB_NAME', 'db.sqlite'),
          autoSave: true,
          entities: entityArray,
          synchronize: true,
        } as TypeOrmModuleOptions;
      },
    }),
    TypeOrmModule.forFeature(entityArray),
  ],
  providers: [DatabaseSeedService],
  exports: [TypeOrmModule, DatabaseSeedService],
})
export class DatabaseModule {}
