import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Permission } from './entities/rbac.entity';
import { Category, Unit, Supplier, Customer, Warehouse, WarehouseLocation, Product, ProductType } from './entities/master.entity';
import { ApprovalWorkflow, ApprovalStep } from './entities/workflow-audit.entity';
import { BOM, BOMItem, Stock } from './entities/purchasing-inventory.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Warehouse) private whRepo: Repository<Warehouse>,
    @InjectRepository(WarehouseLocation) private locRepo: Repository<WarehouseLocation>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(BOM) private bomRepo: Repository<BOM>,
    @InjectRepository(BOMItem) private bomItemRepo: Repository<BOMItem>,
    @InjectRepository(ApprovalWorkflow) private wfRepo: Repository<ApprovalWorkflow>,
    @InjectRepository(ApprovalStep) private stepRepo: Repository<ApprovalStep>,
    @InjectRepository(Stock) private stockRepo: Repository<Stock>
  ) {}

  async onApplicationBootstrap() {
    await this.seedPermissions();
    const roles = await this.seedRoles();
    await this.seedUsers(roles);
    await this.seedMasterData();
    await this.seedApprovalWorkflows(roles);
  }

  private async seedPermissions() {
    const permissions = [
      { code: 'USER_VIEW', description: 'View user list' },
      { code: 'USER_CREATE', description: 'Create user' },
      { code: 'USER_UPDATE', description: 'Update user' },
      { code: 'USER_DELETE', description: 'Delete user' },
      { code: 'PRODUCT_VIEW', description: 'View product details' },
      { code: 'PRODUCT_CREATE', description: 'Create new products' },
      { code: 'PRODUCT_UPDATE', description: 'Update product properties' },
      { code: 'PURCHASE_CREATE', description: 'Create purchase request or order' },
      { code: 'PURCHASE_APPROVE', description: 'Approve purchase workflows' },
      { code: 'STOCK_VIEW', description: 'View stock levels' },
      { code: 'STOCK_ADJUST', description: 'Perform manual stock adjustments' },
      { code: 'PRODUCTION_CREATE', description: 'Create production plan and work orders' },
      { code: 'PRODUCTION_APPROVE', description: 'Approve production workflows' },
      { code: 'REPORT_VIEW', description: 'Access report analytics' },
    ];

    for (const p of permissions) {
      const exists = await this.permRepo.findOneBy({ code: p.code });
      if (!exists) {
        await this.permRepo.save(this.permRepo.create(p));
      }
    }
  }

  private async seedRoles(): Promise<Record<string, Role>> {
    const rolePermissionsMap: Record<string, string[]> = {
      'Super Admin': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PURCHASE_CREATE', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'STOCK_ADJUST', 'PRODUCTION_CREATE', 'PRODUCTION_APPROVE', 'REPORT_VIEW'],
      'Admin': ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'STOCK_VIEW'],
      'Manager': ['PRODUCT_VIEW', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'PRODUCTION_APPROVE', 'REPORT_VIEW'],
      'Purchasing': ['PRODUCT_VIEW', 'PURCHASE_CREATE', 'STOCK_VIEW'],
      'Warehouse': ['PRODUCT_VIEW', 'STOCK_VIEW', 'STOCK_ADJUST'],
      'Production': ['PRODUCT_VIEW', 'STOCK_VIEW', 'PRODUCTION_CREATE'],
      'QA': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
      'Sales': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
      'Finance': ['PRODUCT_VIEW', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'REPORT_VIEW'],
      'Viewer': ['PRODUCT_VIEW', 'STOCK_VIEW', 'REPORT_VIEW'],
    };

    const roles: Record<string, Role> = {};

    for (const [roleName, codes] of Object.entries(rolePermissionsMap)) {
      let role = await this.roleRepo.findOne({ where: { name: roleName }, relations: { permissions: true } });
      if (!role) {
        role = this.roleRepo.create({ name: roleName, description: `${roleName} Role` });
      }

      const dbPermissions: Permission[] = [];
      for (const code of codes) {
        const perm = await this.permRepo.findOneBy({ code });
        if (perm) dbPermissions.push(perm);
      }
      role.permissions = dbPermissions;
      roles[roleName] = await this.roleRepo.save(role);
    }

    return roles;
  }

  private async seedUsers(roles: Record<string, Role>) {
    const enableDemoSeed =
      this.configService.get<string>('ENABLE_DEMO_SEED', 'true').toLowerCase() !== 'false';
    if (!enableDemoSeed) {
      this.logger.log('Demo user seeding skipped (ENABLE_DEMO_SEED=false).');
      return;
    }

    const configuredSeedPassword = this.configService.get<string>('SEED_DEFAULT_PASSWORD')?.trim();
    if (configuredSeedPassword && configuredSeedPassword.length < 8) {
      throw new Error('SEED_DEFAULT_PASSWORD must be at least 8 characters long.');
    }

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (!configuredSeedPassword && isProduction) {
      this.logger.warn(
        'SEED_DEFAULT_PASSWORD is not set in production; seeded demo accounts will use the default bootstrap password. Change account passwords or set ENABLE_DEMO_SEED=false.',
      );
    }

    const seedPassword = configuredSeedPassword || 'FactoryMng2026!';

    const userSeed = [
      { email: 'superadmin@factory.com', name: 'Nuttaphong SuperAdmin', role: 'Super Admin' },
      { email: 'admin@factory.com', name: 'Somsak Admin', role: 'Admin' },
      { email: 'manager@factory.com', name: 'Wichai Manager', role: 'Manager' },
      { email: 'purchasing@factory.com', name: 'Jane Purchasing', role: 'Purchasing' },
      { email: 'warehouse@factory.com', name: 'Somchai Warehouse', role: 'Warehouse' },
      { email: 'production@factory.com', name: 'Kitti Production', role: 'Production' },
      { email: 'qa@factory.com', name: 'Sunee QA', role: 'QA' },
      { email: 'sales@factory.com', name: 'Anan Sales', role: 'Sales' },
      { email: 'finance@factory.com', name: 'Malee Finance', role: 'Finance' },
      { email: 'viewer@factory.com', name: 'Sopa Viewer', role: 'Viewer' },
    ];

    const passwordHash = await bcrypt.hash(seedPassword, 10);

    for (const u of userSeed) {
      const exists = await this.userRepo.findOneBy({ email: u.email });
      if (!exists) {
        const newUser = this.userRepo.create({
          email: u.email,
          fullName: u.name,
          passwordHash,
          roles: [roles[u.role]]
        });
        await this.userRepo.save(newUser);
      }
    }
  }

  private async seedMasterData() {
    // Categories
    const categories = ['Raw Materials', 'Packaging', 'Semi Finished Goods', 'Finished Goods'];
    const dbCategories: Record<string, Category> = {};
    for (const catName of categories) {
      let cat = await this.categoryRepo.findOneBy({ name: catName });
      if (!cat) {
        cat = await this.categoryRepo.save(this.categoryRepo.create({ name: catName }));
      }
      dbCategories[catName] = cat;
    }

    // Units
    const units = ['KG', 'PCS', 'SET', 'LITER'];
    const dbUnits: Record<string, Unit> = {};
    for (const unitName of units) {
      let unit = await this.unitRepo.findOneBy({ name: unitName });
      if (!unit) {
        unit = await this.unitRepo.save(this.unitRepo.create({ name: unitName }));
      }
      dbUnits[unitName] = unit;
    }

    // Suppliers
    let supplier = await this.supplierRepo.findOneBy({ name: 'ABC Manufacturing' });
    if (!supplier) {
      supplier = await this.supplierRepo.save(
        this.supplierRepo.create({
          name: 'ABC Manufacturing',
          contactName: 'John Supplier',
          email: 'john@abcmfg.com',
          phone: '0812345678',
          address: '789 Industry Rd, Bangkok'
        })
      );
    }

    // Customers
    let customer = await this.customerRepo.findOneBy({ name: 'Industrial Partner Corp' });
    if (!customer) {
      customer = await this.customerRepo.save(
        this.customerRepo.create({
          name: 'Industrial Partner Corp',
          contactName: 'Sarah Customer',
          email: 'sarah@industrial.com',
          phone: '0898765432',
          address: '456 Commercial Blvd, Chonburi'
        })
      );
    }

    // Warehouses
    const warehouses = [
      { code: 'WH-A', name: 'Main Warehouse', locations: ['Row-1', 'Row-2'] },
      { code: 'WH-B', name: 'Secondary Warehouse', locations: ['Row-1'] },
    ];
    const dbWarehouses: Record<string, Warehouse> = {};

    for (const wh of warehouses) {
      let dbWh = await this.whRepo.findOneBy({ code: wh.code });
      if (!dbWh) {
        dbWh = await this.whRepo.save(this.whRepo.create({ code: wh.code, name: wh.name }));
        for (const loc of wh.locations) {
          await this.locRepo.save(this.locRepo.create({ code: loc, warehouse: dbWh }));
        }
      }
      dbWarehouses[wh.code] = dbWh;
    }

    // Products
    const productsSeed = [
      { code: 'RM-STEEL', name: 'Steel Sheet', cat: 'Raw Materials', unit: 'KG', type: ProductType.RAW_MATERIAL, cost: 500, price: 0, minStock: 200, wh: 'WH-A', initQty: 850 },
      { code: 'RM-PLASTIC', name: 'Granular Plastic', cat: 'Raw Materials', unit: 'KG', type: ProductType.RAW_MATERIAL, cost: 100, price: 0, minStock: 300, wh: 'WH-A', initQty: 120 },
      { code: 'RM-BOLT', name: 'Steel Bolt M8', cat: 'Raw Materials', unit: 'PCS', type: ProductType.RAW_MATERIAL, cost: 5, price: 0, minStock: 1000, wh: 'WH-A', initQty: 5000 },
      { code: 'PK-BOX', name: 'Cardboard Box Standard', cat: 'Packaging', unit: 'SET', type: ProductType.PACKAGING, cost: 20, price: 0, minStock: 500, wh: 'WH-A', initQty: 1000 },
      { code: 'FG-PRODUCT-A', name: 'Finished Machine A', cat: 'Finished Goods', unit: 'PCS', type: ProductType.FINISHED_GOOD, cost: 1500, price: 2500, minStock: 50, wh: 'WH-B', initQty: 75 },
    ];

    const dbProducts: Record<string, Product> = {};

    for (const p of productsSeed) {
      let dbProd = await this.productRepo.findOneBy({ code: p.code });
      if (!dbProd) {
        dbProd = await this.productRepo.save(
          this.productRepo.create({
            code: p.code,
            name: p.name,
            category: dbCategories[p.cat],
            unit: dbUnits[p.unit],
            type: p.type,
            cost: p.cost,
            price: p.price,
            minimumStock: p.minStock,
            maximumStock: 100000,
            warehouse: dbWarehouses[p.wh],
            status: 'ACTIVE'
          })
        );

        // Seed initial stock
        const status = p.initQty === 0 ? 'OUT' : p.initQty < p.minStock ? 'LOW' : 'NORMAL';
        await this.stockRepo.save(
          this.stockRepo.create({
            product: dbProd,
            warehouse: dbWarehouses[p.wh],
            quantity: p.initQty,
            status
          })
        );
      }
      dbProducts[p.code] = dbProd;
    }

    // Bill of Materials (BOM)
    let bom = await this.bomRepo.findOne({ where: { product: { id: dbProducts['FG-PRODUCT-A'].id } } });
    if (!bom) {
      bom = await this.bomRepo.save(
        this.bomRepo.create({
          code: 'BOM-PRODUCT-A',
          product: dbProducts['FG-PRODUCT-A'],
          description: 'Standard BOM for Finished Machine A'
        })
      );

      const items = [
        { product: dbProducts['RM-STEEL'], qty: 2.0 },
        { product: dbProducts['RM-PLASTIC'], qty: 1.0 },
        { product: dbProducts['RM-BOLT'], qty: 4.0 },
        { product: dbProducts['PK-BOX'], qty: 1.0 },
      ];

      for (const item of items) {
        await this.bomItemRepo.save(
          this.bomItemRepo.create({
            bom,
            product: item.product,
            quantityNeeded: item.qty
          })
        );
      }
    }
  }

  private async seedApprovalWorkflows(roles: Record<string, Role>) {
    const defaultWorkflows = [
      { targetType: 'PURCHASE_REQUEST', minAmount: 0, maxAmount: 9999, steps: ['Manager'] },
      { targetType: 'PURCHASE_REQUEST', minAmount: 10000, maxAmount: 99999, steps: ['Manager', 'Finance'] },
      { targetType: 'PURCHASE_REQUEST', minAmount: 100000, maxAmount: 99999999, steps: ['Manager', 'Super Admin', 'Finance'] },
    ];

    for (const dwf of defaultWorkflows) {
      const exists = await this.wfRepo.findOneBy({
        targetType: dwf.targetType,
        minAmount: dwf.minAmount,
        maxAmount: dwf.maxAmount
      });

      if (!exists) {
        const wf = await this.wfRepo.save(
          this.wfRepo.create({
            targetType: dwf.targetType,
            minAmount: dwf.minAmount,
            maxAmount: dwf.maxAmount,
            isActive: true
          })
        );

        for (let i = 0; i < dwf.steps.length; i++) {
          const roleName = dwf.steps[i];
          const role = roles[roleName];
          if (role) {
            await this.stepRepo.save(
              this.stepRepo.create({
                workflow: wf,
                stepOrder: i + 1,
                role
              })
            );
          }
        }
      }
    }
  }
}
