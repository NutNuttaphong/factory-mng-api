import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { buildDatabaseOptions, entityArray } from './database-config.util';
import { DatabaseSeedService } from './database-seed.service';
import {
  ApprovalStep,
  ApprovalWorkflow,
  BOM,
  BOMItem,
  Category,
  Customer,
  Permission,
  Product,
  Role,
  Stock,
  Supplier,
  Unit,
  User,
  Warehouse,
  WarehouseLocation,
} from './entities';

describe('Database Configuration & Migrations Readiness', () => {
  it('configures PostgreSQL via DATABASE_URL and disables synchronize when DB_RUN_MIGRATIONS=true', () => {
    const opts = buildDatabaseOptions({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@postgres.railway.internal:5432/railway',
      DB_RUN_MIGRATIONS: 'true',
      DB_SSL: 'true',
    }) as any;

    expect(opts.type).toBe('postgres');
    expect(opts.url).toBe('postgresql://user:pass@postgres.railway.internal:5432/railway');
    expect(opts.migrationsRun).toBe(true);
    expect(opts.synchronize).toBe(false);
    expect(opts.ssl).toEqual({ rejectUnauthorized: false });
    expect(opts.entities.length).toBe(entityArray.length);
  });

  it('configures PostgreSQL via individual DB_* vars with explicit DB_SYNCHRONIZE=false', () => {
    const opts = buildDatabaseOptions({
      DB_TYPE: 'postgres',
      DB_HOST: 'db.internal',
      DB_PORT: '5433',
      DB_USERNAME: 'appuser',
      DB_PASSWORD: 'secret',
      DB_DATABASE: 'factory',
      DB_SYNCHRONIZE: 'false',
    }) as any;

    expect(opts.type).toBe('postgres');
    expect(opts.host).toBe('db.internal');
    expect(opts.port).toBe(5433);
    expect(opts.username).toBe('appuser');
    expect(opts.database).toBe('factory');
    expect(opts.synchronize).toBe(false);
    expect(opts.ssl).toBeUndefined();
  });

  it('falls back to sqljs for local dev and supports :memory: without autoSave', () => {
    const memOpts = buildDatabaseOptions({ DB_NAME: ':memory:' }) as any;
    expect(memOpts.type).toBe('sqljs');
    expect(memOpts.autoSave).toBe(false);
    expect(memOpts.synchronize).toBe(true);

    const fileOpts = buildDatabaseOptions({}) as any;
    expect(fileOpts.type).toBe('sqljs');
    expect(fileOpts.location).toBe('db.sqlite');
    expect(fileOpts.autoSave).toBe(true);
  });

  it('initializes all entities and bootstraps DatabaseSeedService with SEED_DEFAULT_PASSWORD in memory', async () => {
    const ds = new DataSource(buildDatabaseOptions({ DB_NAME: ':memory:' }));
    await ds.initialize();

    try {
      const customPass = 'CustomSeedPass2026!';
      const config = {
        get: (key: string, def?: any) => {
          if (key === 'SEED_DEFAULT_PASSWORD') return customPass;
          if (key === 'ENABLE_DEMO_SEED') return 'true';
          return def;
        },
      } as unknown as ConfigService;

      const seedService = new DatabaseSeedService(
        config,
        ds.getRepository(Permission),
        ds.getRepository(Role),
        ds.getRepository(User),
        ds.getRepository(Category),
        ds.getRepository(Unit),
        ds.getRepository(Supplier),
        ds.getRepository(Customer),
        ds.getRepository(Warehouse),
        ds.getRepository(WarehouseLocation),
        ds.getRepository(Product),
        ds.getRepository(BOM),
        ds.getRepository(BOMItem),
        ds.getRepository(ApprovalWorkflow),
        ds.getRepository(ApprovalStep),
        ds.getRepository(Stock),
      );

      await seedService.onApplicationBootstrap();

      const admin = await ds
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email: 'superadmin@factory.com' })
        .getOne();

      expect(admin).toBeTruthy();
      expect(await bcrypt.compare(customPass, admin!.passwordHash)).toBe(true);
    } finally {
      await ds.destroy();
    }
  });
});
