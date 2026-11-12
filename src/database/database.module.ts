import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseSeedService } from './database-seed.service';
import { buildDatabaseOptions, entityArray } from './database-config.util';

const logger = new Logger('DatabaseModule');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const options = buildDatabaseOptions({
          NODE_ENV: nodeEnv,
          DATABASE_URL: configService.get<string>('DATABASE_URL'),
          DB_TYPE: configService.get<string>('DB_TYPE'),
          DB_HOST: configService.get<string>('DB_HOST'),
          DB_PORT: configService.get<string>('DB_PORT'),
          DB_USERNAME: configService.get<string>('DB_USERNAME'),
          DB_PASSWORD: configService.get<string>('DB_PASSWORD'),
          DB_DATABASE: configService.get<string>('DB_DATABASE'),
          DB_NAME: configService.get<string>('DB_NAME'),
          DB_SSL: configService.get<string>('DB_SSL'),
          DB_SYNCHRONIZE: configService.get<string>('DB_SYNCHRONIZE'),
          DB_RUN_MIGRATIONS: configService.get<string>('DB_RUN_MIGRATIONS'),
        });

        if (nodeEnv === 'production' && options.synchronize) {
          logger.warn(
            'Database synchronize=true is active in production. Generate/run TypeORM migrations and set DB_SYNCHRONIZE=false once schema is initialized.',
          );
        }

        return options as TypeOrmModuleOptions;
      },
    }),
    TypeOrmModule.forFeature(entityArray),
  ],
  providers: [DatabaseSeedService],
  exports: [TypeOrmModule, DatabaseSeedService],
})
export class DatabaseModule {}
