import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { resolveJwtSecret } from './jwt-secret.util';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { DatabaseSeedService } from '../database/database-seed.service';
import { PurchasingService } from '../purchasing/purchasing.service';
import { SalesService } from '../sales/sales.service';
import { ProductionService } from '../production/production.service';
import { InMemoryRateLimiter, parseTrustProxy, resolveClientIp } from '../common/security.util';
import { JwtStrategy } from './strategies/jwt.strategy';

function oid(): string {
  return new Types.ObjectId().toHexString();
}

function mockQuery<T>(value: T) {
  const q: any = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return q;
}

describe('Security Hardening Checks', () => {
  describe('resolveJwtSecret', () => {
    it('throws in production when JWT_SECRET is missing or weak', () => {
      const missingConfig = {
        get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
      } as unknown as ConfigService;
      expect(() => resolveJwtSecret(missingConfig)).toThrow();

      const weakConfig = {
        get: (key: string) =>
          key === 'NODE_ENV' ? 'production' : key === 'JWT_SECRET' ? 'secretKey123' : undefined,
      } as unknown as ConfigService;
      expect(() => resolveJwtSecret(weakConfig)).toThrow();
    });

    it('returns configured strong secret in production', () => {
      const validConfig = {
        get: (key: string) =>
          key === 'NODE_ENV'
            ? 'production'
            : key === 'JWT_SECRET'
              ? 'very-strong-production-secret-key'
              : undefined,
      } as unknown as ConfigService;
      expect(resolveJwtSecret(validConfig)).toBe('very-strong-production-secret-key');
    });
  });

  describe('PermissionsGuard', () => {
    const createContext = (user?: any): ExecutionContext =>
      ({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as unknown as ExecutionContext;

    it('blocks user without required permission and allows Super Admin', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['USER_CREATE']),
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);

      const viewer = {
        id: oid(),
        roles: [{ name: 'Viewer', permissions: [{ code: 'PRODUCT_VIEW' }] }],
      };
      expect(() => guard.canActivate(createContext(viewer))).toThrow(ForbiddenException);

      const superAdmin = {
        id: oid(),
        roles: [{ name: 'Super Admin', permissions: [] }],
      };
      expect(guard.canActivate(createContext(superAdmin))).toBe(true);
    });
  });

  describe('NotificationsService IDOR protection', () => {
    it('blocks marking another user notification as read', async () => {
      const notifId = oid();
      const model = {
        findById: jest.fn().mockReturnValue(
          mockQuery({
            id: notifId,
            recipientId: 'user-owner',
            recipientRole: null,
            isRead: false,
            save: jest.fn(),
          }),
        ),
      };
      const service = new NotificationsService(model as any);
      const otherUser = { id: 'user-attacker', roles: [{ name: 'Viewer' }] } as any;

      await expect(service.markRead(notifId, otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('allows recipient user or matching role to mark notification as read', async () => {
      const notifId = oid();
      const notif = {
        id: notifId,
        recipientId: null,
        recipientRole: 'Manager',
        isRead: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      const model = {
        findById: jest.fn().mockReturnValue(mockQuery(notif)),
      };
      const service = new NotificationsService(model as any);
      const manager = { id: 'user-mgr', roles: [{ name: 'Manager' }] } as any;

      const updated = await service.markRead(notifId, manager);
      expect(updated.isRead).toBe(true);
      expect(notif.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('UsersService passwordHash sanitization', () => {
    it('never returns passwordHash or tokenVersion from create or update', async () => {
      const userId = oid();
      const roleId = oid();
      const existingUser = {
        id: userId,
        _id: userId,
        email: 'a@factory.com',
        fullName: 'User A',
        passwordHash: '$2b$10$hashed',
        tokenVersion: 1,
        roles: [{ id: roleId, _id: roleId, name: 'Viewer', permissions: [] }],
        isActive: true,
        save: jest.fn().mockResolvedValue(undefined),
      };
      const createdUser = {
        id: oid(),
        email: 'new@factory.com',
        fullName: 'New User',
        passwordHash: '$2b$10$hashed',
        tokenVersion: 0,
        roles: [{ id: roleId, name: 'Viewer', permissions: [] }],
        isActive: true,
      };
      const userModel = {
        findOne: jest.fn().mockReturnValue(mockQuery(null)),
        findById: jest
          .fn()
          .mockReturnValueOnce(mockQuery(createdUser))
          .mockReturnValueOnce(mockQuery(existingUser))
          .mockReturnValueOnce(mockQuery(existingUser)),
        create: jest.fn().mockResolvedValue({ id: createdUser.id }),
      };
      const roleModel = {
        findOne: jest.fn().mockReturnValue(mockQuery({ id: roleId, _id: roleId, name: 'Viewer', permissions: [] })),
      };
      const service = new UsersService(userModel as any, roleModel as any, {} as any);

      const created = await service.create({
        email: 'new@factory.com',
        password: 'StrongPassword123!',
        fullName: 'New User',
        roleNames: ['Viewer'],
      });
      expect((created as any).passwordHash).toBeUndefined();
      expect((created as any).tokenVersion).toBeUndefined();

      const updated = await service.update(userId, { fullName: 'Updated Name' });
      expect((updated as any).passwordHash).toBeUndefined();
      expect((updated as any).tokenVersion).toBeUndefined();
    });
  });

  describe('AuthService.changePassword, logout & JwtStrategy revocation', () => {
    const createMockUserModel = (user: any) => ({
      findOne: jest.fn().mockReturnValue(mockQuery(user)),
    });

    it('rejects incorrect current password', async () => {
      const userId = oid();
      const hash = await bcrypt.hash('OldPass123!', 10);
      const model = createMockUserModel({ id: userId, passwordHash: hash, isActive: true });
      const auth = new AuthService(model as any, {} as any);

      await expect(auth.changePassword(userId, 'WrongPass!', 'NewPass123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects reusing the same password', async () => {
      const userId = oid();
      const hash = await bcrypt.hash('SamePass123!', 10);
      const model = createMockUserModel({ id: userId, passwordHash: hash, isActive: true });
      const auth = new AuthService(model as any, {} as any);

      await expect(auth.changePassword(userId, 'SamePass123!', 'SamePass123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates password hash, increments tokenVersion, and returns a fresh token', async () => {
      const userId = oid();
      const oldHash = await bcrypt.hash('OldPass123!', 10);
      const userObj = {
        id: userId,
        email: 'u1@factory.com',
        passwordHash: oldHash,
        isActive: true,
        tokenVersion: 0,
        save: jest.fn().mockResolvedValue(undefined),
      };
      const model = createMockUserModel(userObj);
      const jwtService = { sign: jest.fn().mockReturnValue('fresh-jwt') };
      const auth = new AuthService(model as any, jwtService as any);

      const res = await auth.changePassword(userId, 'OldPass123!', 'NewStrongPass123!');
      expect(res).toEqual({
        status: 'success',
        message: 'Password changed successfully',
        accessToken: 'fresh-jwt',
      });
      expect(userObj.tokenVersion).toBe(1);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'u1@factory.com',
        sub: userId,
        tokenVersion: 1,
      });
      expect(userObj.save).toHaveBeenCalledTimes(1);
      expect(await bcrypt.compare('NewStrongPass123!', userObj.passwordHash)).toBe(true);
    });

    it('revokes tokens on logout by incrementing tokenVersion', async () => {
      const userId = oid();
      const model = {
        updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })),
      };
      const auth = new AuthService(model as any, {} as any);

      const res = await auth.logout(userId);
      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: userId },
        { $inc: { tokenVersion: 1 } },
      );
      expect(res).toEqual({ status: 'success', message: 'Logged out successfully' });
    });

    it('rejects revoked JWTs whose tokenVersion does not match the database user', async () => {
      const userId = oid();
      const config = {
        get: (key: string) => (key === 'JWT_SECRET' ? 'very-strong-test-secret-key' : undefined),
      } as unknown as ConfigService;
      const userModel = {
        findOne: jest
          .fn()
          .mockReturnValue(
            mockQuery({ id: userId, email: 'u1@factory.com', isActive: true, tokenVersion: 2 }),
          ),
      };
      const strategy = new JwtStrategy(config, userModel as any);

      await expect(
        strategy.validate({ sub: userId, email: 'u1@factory.com', tokenVersion: 1 }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate({ sub: userId, email: 'u1@factory.com', tokenVersion: 2 }),
      ).resolves.toMatchObject({ id: userId });
    });
  });

  describe('DatabaseSeedService controls', () => {
    it('skips demo user creation when ENABLE_DEMO_SEED is false', async () => {
      const config = {
        get: (key: string, def?: any) => (key === 'ENABLE_DEMO_SEED' ? 'false' : def),
      } as unknown as ConfigService;
      const userModel = { findOne: jest.fn(), create: jest.fn() };
      const noopModel = {} as any;
      const seed = new DatabaseSeedService(
        config,
        noopModel,
        noopModel,
        userModel as any,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
        noopModel,
      );

      await (seed as any).seedUsers({});
      expect(userModel.findOne).not.toHaveBeenCalled();
      expect(userModel.create).not.toHaveBeenCalled();
    });
  });

  describe('Numeric & bounds validation across business services', () => {
    it('rejects empty or negative Purchase Request items', async () => {
      const prService = new PurchasingService(
        { countDocuments: jest.fn().mockReturnValue(mockQuery(0)) } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(prService.createPR({ id: oid() } as any, [])).rejects.toThrow(BadRequestException);
      await expect(
        prService.createPR({ id: oid() } as any, [
          { productId: oid(), quantity: -5, estimatedPrice: 10 },
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prService.createPR({ id: oid() } as any, [
          { productId: oid(), quantity: 5, estimatedPrice: -1 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty or negative Sales Order items', async () => {
      const salesService = new SalesService(
        { countDocuments: jest.fn().mockReturnValue(mockQuery(0)) } as any,
        {} as any,
        { findById: jest.fn().mockReturnValue(mockQuery({ id: oid() })) } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(salesService.createOrder({ id: oid() } as any, oid(), [])).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        salesService.createOrder({ id: oid() } as any, oid(), [
          { productId: oid(), quantity: 0, price: 100 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid Production quantities and inverted plan dates', async () => {
      const prodService = new ProductionService(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(
        prodService.createBOM({ code: 'BOM-1', productId: oid(), items: [] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.createPlan({
          productId: oid(),
          targetQuantity: 0,
          startDate: new Date('2026-11-10'),
          endDate: new Date('2026-11-12'),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.createPlan({
          productId: oid(),
          targetQuantity: 10,
          startDate: new Date('2026-11-15'),
          endDate: new Date('2026-11-12'),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.reportResult(oid(), -1, 0, '', { id: oid() } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UsersService privilege escalation guards', () => {
    const adminId = oid();
    const saId = oid();
    const mgrId = oid();

    const adminActor = {
      id: adminId,
      roles: [
        {
          name: 'Admin',
          permissions: [{ code: 'USER_VIEW' }, { code: 'USER_CREATE' }, { code: 'USER_UPDATE' }],
        },
      ],
    } as any;
    const superAdminActor = { id: saId, roles: [{ name: 'Super Admin', permissions: [] }] } as any;

    it('blocks non-Super Admin from creating a Super Admin or higher-privilege role', async () => {
      const userModel = { findOne: jest.fn(), create: jest.fn() };
      const roleModel = {
        findOne: jest.fn().mockReturnValue(
          mockQuery({
            id: oid(),
            name: 'Manager',
            permissions: [{ code: 'PURCHASE_APPROVE' }],
          }),
        ),
      };
      const service = new UsersService(userModel as any, roleModel as any, {} as any);

      await expect(
        service.create(
          {
            email: 'escalate@factory.com',
            password: 'StrongPassword123!',
            fullName: 'Attacker',
            roleNames: ['Super Admin'],
          },
          adminActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.create(
          {
            email: 'mgr@factory.com',
            password: 'StrongPassword123!',
            fullName: 'Bypass Manager',
            roleNames: ['Manager'],
          },
          adminActor,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('blocks non-Super Admin from modifying higher-privilege users or changing own roles', async () => {
      const targetSuperAdmin = {
        id: saId,
        email: 'sa@factory.com',
        roles: [{ id: oid(), name: 'Super Admin', permissions: [] }],
        save: jest.fn(),
      };
      const targetManager = {
        id: mgrId,
        email: 'mgr@factory.com',
        roles: [{ id: oid(), name: 'Manager', permissions: [{ code: 'PURCHASE_APPROVE' }] }],
        save: jest.fn(),
      };
      const targetSelfAdmin = {
        id: adminId,
        email: 'admin@factory.com',
        roles: [{ id: oid(), name: 'Admin', permissions: [{ code: 'USER_UPDATE' }] }],
        save: jest.fn(),
      };
      const userModel = {
        findById: jest
          .fn()
          .mockReturnValueOnce(mockQuery(targetSuperAdmin))
          .mockReturnValueOnce(mockQuery(targetManager))
          .mockReturnValueOnce(mockQuery(targetSelfAdmin))
          .mockReturnValueOnce(mockQuery(targetSuperAdmin)),
        deleteOne: jest.fn(),
      };
      const service = new UsersService(userModel as any, {} as any, {} as any);

      await expect(service.update(saId, { fullName: 'Hacked' }, adminActor)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.update(mgrId, { password: 'NewPassword123!' }, adminActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(adminId, { roleNames: ['Super Admin'] }, adminActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.remove(saId, adminActor)).rejects.toThrow(ForbiddenException);
      expect(targetSuperAdmin.save).not.toHaveBeenCalled();
      expect(userModel.deleteOne).not.toHaveBeenCalled();
    });

    it('increments tokenVersion and strips sensitive fields when password or active status changes', async () => {
      const viewerId = oid();
      const targetUser = {
        id: viewerId,
        _id: viewerId,
        email: 'sub@factory.com',
        tokenVersion: 3,
        isActive: true,
        roles: [{ id: oid(), name: 'Limited', permissions: [{ code: 'USER_VIEW' }] }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      const userModel = {
        findById: jest.fn().mockReturnValue(mockQuery(targetUser)),
      };
      const service = new UsersService(userModel as any, {} as any, {} as any);

      const updated = await service.update(viewerId, { password: 'NewStrongPassword1!' }, adminActor);
      expect(targetUser.tokenVersion).toBe(4);
      expect((updated as any).passwordHash).toBeUndefined();
      expect((updated as any).tokenVersion).toBeUndefined();
    });

    it('allows Super Admin to assign Super Admin role and modify users', async () => {
      const newId = oid();
      const roleId = oid();
      const createdDoc = {
        id: newId,
        _id: newId,
        email: 'newsa@factory.com',
        fullName: 'New SA',
        passwordHash: '$2b$10$hash',
        tokenVersion: 0,
        roles: [{ id: roleId, name: 'Super Admin', permissions: [] }],
      };
      const userModel = {
        findOne: jest.fn().mockReturnValue(mockQuery(null)),
        create: jest.fn().mockResolvedValue({ id: newId }),
        findById: jest.fn().mockReturnValue(mockQuery(createdDoc)),
      };
      const roleModel = {
        findOne: jest.fn().mockReturnValue(mockQuery({ id: roleId, _id: roleId, name: 'Super Admin', permissions: [] })),
      };
      const service = new UsersService(userModel as any, roleModel as any, {} as any);

      const created = await service.create(
        {
          email: 'newsa@factory.com',
          password: 'StrongPassword123!',
          fullName: 'New SA',
          roleNames: ['Super Admin'],
        },
        superAdminActor,
      );
      expect(created.email).toBe('newsa@factory.com');
      expect((created as any).passwordHash).toBeUndefined();
    });
  });

  describe('Security utilities (rate limiter & proxy IP resolution)', () => {
    it('enforces max attempts, bounds entries, and resets after window', () => {
      const limiter = new InMemoryRateLimiter(1000, 2, 3);
      expect(limiter.consume('1.1.1.1', 100).allowed).toBe(true);
      expect(limiter.consume('1.1.1.1', 200).allowed).toBe(true);
      const blocked = limiter.consume('1.1.1.1', 300);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBe(1);

      expect(limiter.consume('1.1.1.1', 1200).allowed).toBe(true);

      limiter.consume('2.2.2.2', 1200);
      limiter.consume('3.3.3.3', 1200);
      limiter.consume('4.4.4.4', 1200);
      expect(limiter.size).toBe(3);
    });

    it('resolves proxy-verified req.ip and sets trust proxy safely', () => {
      expect(parseTrustProxy(undefined, 'production')).toBe(1);
      expect(parseTrustProxy(undefined, 'development')).toBe(false);
      expect(parseTrustProxy('2', 'production')).toBe(2);
      expect(resolveClientIp({ ip: '203.0.113.5' })).toBe('203.0.113.5');
      expect(resolveClientIp({ socket: { remoteAddress: '127.0.0.1' } })).toBe('127.0.0.1');
    });
  });
});
