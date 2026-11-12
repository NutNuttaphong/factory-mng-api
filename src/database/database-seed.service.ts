import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Permission,
  Role,
  User,
  Category,
  Unit,
  Supplier,
  Customer,
  Warehouse,
  Product,
  ProductType,
  BOM,
  ApprovalWorkflow,
  ApprovalStep,
  Stock,
} from './entities';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Permission.name) private permModel: Model<Permission>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Unit.name) private unitModel: Model<Unit>,
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(Warehouse.name) private whModel: Model<Warehouse>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(BOM.name) private bomModel: Model<BOM>,
    @InjectModel(ApprovalWorkflow.name) private wfModel: Model<ApprovalWorkflow>,
    @InjectModel(ApprovalStep.name) private stepModel: Model<ApprovalStep>,
    @InjectModel(Stock.name) private stockModel: Model<Stock>,
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
      const exists = await this.permModel.findOne({ code: p.code }).exec();
      if (!exists) {
        await this.permModel.create(p);
      }
    }
  }

  private async seedRoles(): Promise<Record<string, Role>> {
    const rolePermissionsMap: Record<string, string[]> = {
      'Super Admin': [
        'USER_VIEW', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
        'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE',
        'PURCHASE_CREATE', 'PURCHASE_APPROVE', 'STOCK_VIEW', 'STOCK_ADJUST',
        'PRODUCTION_CREATE', 'PRODUCTION_APPROVE', 'REPORT_VIEW',
      ],
      'Admin': [
        'USER_VIEW', 'USER_CREATE', 'USER_UPDATE',
        'PRODUCT_VIEW', 'PRODUCT_CREATE', 'PRODUCT_UPDATE', 'STOCK_VIEW',
      ],
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
      const dbPermissions = await this.permModel.find({ code: { $in: codes } }).exec();
      const permIds = dbPermissions.map((p) => p._id);

      let role = await this.roleModel.findOne({ name: roleName }).exec();
      if (!role) {
        role = await this.roleModel.create({
          name: roleName,
          description: `${roleName} Role`,
          permissions: permIds,
        });
      } else {
        role.permissions = permIds as any;
        await role.save();
      }
      roles[roleName] = role;
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
      const exists = await this.userModel.findOne({ email: u.email }).exec();
      if (!exists) {
        await this.userModel.create({
          email: u.email,
          fullName: u.name,
          passwordHash,
          roles: roles[u.role] ? [roles[u.role]._id] : [],
          isActive: true,
        });
      }
    }
  }

  private async seedMasterData() {
    const categories = ['Raw Materials', 'Packaging', 'Semi Finished Goods', 'Finished Goods'];
    const dbCategories: Record<string, Category> = {};
    for (const catName of categories) {
      let cat = await this.categoryModel.findOne({ name: catName }).exec();
      if (!cat) {
        cat = await this.categoryModel.create({ name: catName });
      }
      dbCategories[catName] = cat;
    }

    const units = ['KG', 'PCS', 'SET', 'LITER'];
    const dbUnits: Record<string, Unit> = {};
    for (const unitName of units) {
      let unit = await this.unitModel.findOne({ name: unitName }).exec();
      if (!unit) {
        unit = await this.unitModel.create({ name: unitName });
      }
      dbUnits[unitName] = unit;
    }

    const supplierExists = await this.supplierModel.findOne({ name: 'ABC Manufacturing' }).exec();
    if (!supplierExists) {
      await this.supplierModel.create({
        name: 'ABC Manufacturing',
        contactName: 'John Supplier',
        email: 'john@abcmfg.com',
        phone: '0812345678',
        address: '789 Industry Rd, Bangkok',
      });
    }

    const customerExists = await this.customerModel.findOne({ name: 'Industrial Partner Corp' }).exec();
    if (!customerExists) {
      await this.customerModel.create({
        name: 'Industrial Partner Corp',
        contactName: 'Sarah Customer',
        email: 'sarah@industrial.com',
        phone: '0898765432',
        address: '456 Commercial Blvd, Chonburi',
      });
    }

    const warehouses = [
      { code: 'WH-A', name: 'Main Warehouse', locations: [{ code: 'Row-1' }, { code: 'Row-2' }] },
      { code: 'WH-B', name: 'Secondary Warehouse', locations: [{ code: 'Row-1' }] },
    ];
    const dbWarehouses: Record<string, Warehouse> = {};

    for (const wh of warehouses) {
      let dbWh = await this.whModel.findOne({ code: wh.code }).exec();
      if (!dbWh) {
        dbWh = await this.whModel.create(wh);
      }
      dbWarehouses[wh.code] = dbWh;
    }

    const productsSeed = [
      { code: 'RM-STEEL', name: 'Steel Sheet', cat: 'Raw Materials', unit: 'KG', type: ProductType.RAW_MATERIAL, cost: 500, price: 0, minStock: 200, wh: 'WH-A', initQty: 850 },
      { code: 'RM-PLASTIC', name: 'Granular Plastic', cat: 'Raw Materials', unit: 'KG', type: ProductType.RAW_MATERIAL, cost: 100, price: 0, minStock: 300, wh: 'WH-A', initQty: 120 },
      { code: 'RM-BOLT', name: 'Steel Bolt M8', cat: 'Raw Materials', unit: 'PCS', type: ProductType.RAW_MATERIAL, cost: 5, price: 0, minStock: 1000, wh: 'WH-A', initQty: 5000 },
      { code: 'PK-BOX', name: 'Cardboard Box Standard', cat: 'Packaging', unit: 'SET', type: ProductType.PACKAGING, cost: 20, price: 0, minStock: 500, wh: 'WH-A', initQty: 1000 },
      { code: 'FG-PRODUCT-A', name: 'Finished Machine A', cat: 'Finished Goods', unit: 'PCS', type: ProductType.FINISHED_GOOD, cost: 1500, price: 2500, minStock: 50, wh: 'WH-B', initQty: 75 },
    ];

    const dbProducts: Record<string, Product> = {};
    for (const p of productsSeed) {
      let dbProd = await this.productModel.findOne({ code: p.code }).exec();
      if (!dbProd) {
        dbProd = await this.productModel.create({
          code: p.code,
          name: p.name,
          category: dbCategories[p.cat]._id,
          unit: dbUnits[p.unit]._id,
          type: p.type,
          cost: p.cost,
          price: p.price,
          minimumStock: p.minStock,
          maximumStock: 100000,
          warehouse: dbWarehouses[p.wh]._id,
          status: 'ACTIVE',
        });

        const status = p.initQty === 0 ? 'OUT' : p.initQty < p.minStock ? 'LOW' : 'NORMAL';
        await this.stockModel.create({
          product: dbProd._id,
          warehouse: dbWarehouses[p.wh]._id,
          quantity: p.initQty,
          status,
        });
      }
      dbProducts[p.code] = dbProd;
    }

    const bom = await this.bomModel.findOne({ product: dbProducts['FG-PRODUCT-A']._id }).exec();
    if (!bom) {
      await this.bomModel.create({
        code: 'BOM-PRODUCT-A',
        product: dbProducts['FG-PRODUCT-A']._id,
        description: 'Standard BOM for Finished Machine A',
        items: [
          { product: dbProducts['RM-STEEL']._id, quantityNeeded: 2.0 },
          { product: dbProducts['RM-PLASTIC']._id, quantityNeeded: 1.0 },
          { product: dbProducts['RM-BOLT']._id, quantityNeeded: 4.0 },
          { product: dbProducts['PK-BOX']._id, quantityNeeded: 1.0 },
        ],
        isActive: true,
      });
    }
  }

  private async seedApprovalWorkflows(roles: Record<string, Role>) {
    const defaultWorkflows = [
      { targetType: 'PURCHASE_REQUEST', minAmount: 0, maxAmount: 9999, steps: ['Manager'] },
      { targetType: 'PURCHASE_REQUEST', minAmount: 10000, maxAmount: 99999, steps: ['Manager', 'Finance'] },
      { targetType: 'PURCHASE_REQUEST', minAmount: 100000, maxAmount: 99999999, steps: ['Manager', 'Super Admin', 'Finance'] },
    ];

    for (const dwf of defaultWorkflows) {
      const exists = await this.wfModel
        .findOne({
          targetType: dwf.targetType,
          minAmount: dwf.minAmount,
          maxAmount: dwf.maxAmount,
        })
        .exec();

      if (!exists) {
        const wf = await this.wfModel.create({
          targetType: dwf.targetType,
          minAmount: dwf.minAmount,
          maxAmount: dwf.maxAmount,
          isActive: true,
        });

        for (let i = 0; i < dwf.steps.length; i++) {
          const role = roles[dwf.steps[i]];
          if (role) {
            await this.stepModel.create({
              workflow: wf._id,
              stepOrder: i + 1,
              role: role._id,
            });
          }
        }
      }
    }
  }
}
