import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import * as entities from './entities';

export const entityArray = Object.values(entities).filter(
  (val) => typeof val === 'function',
);

export interface DatabaseEnvConfig {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  DB_TYPE?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_DATABASE?: string;
  DB_NAME?: string;
  DB_SSL?: string;
  DB_SYNCHRONIZE?: string;
  DB_RUN_MIGRATIONS?: string;
}

/**
 * Builds shared TypeORM DataSource options for both NestJS runtime and TypeORM CLI.
 */
export function buildDatabaseOptions(env: DatabaseEnvConfig): DataSourceOptions {
  const databaseUrl = env.DATABASE_URL?.trim();
  const dbType = (env.DB_TYPE || '').trim().toLowerCase();
  const migrationsRun = (env.DB_RUN_MIGRATIONS || 'false').trim().toLowerCase() === 'true';

  const rawSync = env.DB_SYNCHRONIZE?.trim().toLowerCase();
  const synchronize =
    rawSync !== undefined && rawSync !== ''
      ? rawSync !== 'false'
      : !migrationsRun;

  const migrations = [join(__dirname, 'migrations/*{.ts,.js}')];
  const usePostgres =
    dbType === 'postgres' ||
    Boolean(databaseUrl && /^postgres(ql)?:\/\//i.test(databaseUrl));

  if (usePostgres) {
    const useSsl = (env.DB_SSL || '').trim().toLowerCase() === 'true';
    const basePostgres: Record<string, any> = {
      type: 'postgres',
      entities: entityArray,
      migrations,
      migrationsRun,
      synchronize,
    };

    if (useSsl) {
      basePostgres.ssl = { rejectUnauthorized: false };
    }

    if (databaseUrl) {
      return {
        ...basePostgres,
        url: databaseUrl,
      } as DataSourceOptions;
    }

    return {
      ...basePostgres,
      host: env.DB_HOST || 'localhost',
      port: Number(env.DB_PORT || 5432),
      username: env.DB_USERNAME || 'postgres',
      password: env.DB_PASSWORD || 'postgres',
      database: env.DB_DATABASE || 'factory_mng',
    } as DataSourceOptions;
  }

  const location = env.DB_NAME || 'db.sqlite';
  return {
    type: 'sqljs',
    location,
    autoSave: location !== ':memory:',
    entities: entityArray,
    migrations,
    migrationsRun,
    synchronize,
  } as DataSourceOptions;
}
