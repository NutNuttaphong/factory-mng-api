import { ExecutionContext, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
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
      const strong = 'a-very-strong-production-secret-key-2026';
      const config = {
        get: (key: string) =>
          key === 'NODE_ENV' ? 'production' : key === 'JWT_SECRET' ? strong : undefined,
      } as unknown as ConfigService;
      expect(resolveJwtSecret(config)).toBe(strong);
    });

    it('reuses ephemeral secret in non-production when unset', () => {
      const devConfig = {
        get: () => undefined,
      } as unknown as ConfigService;
      const first = resolveJwtSecret(devConfig);
      const second = resolveJwtSecret(devConfig);
      expect(first).toBeTruthy();
      expect(first).not.toBe('secretKey123');
      expect(first).toBe(second);
    });
  });

  describe('PermissionsGuard', () => {
    const createContext = (user: any): ExecutionContext =>
      ({
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as unknown as ExecutionContext;

    it('denies user without required permission', () => {
      const reflector = {
        getAllAndOverride: () => ['PRODUCT_UPDATE'],
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const viewer = {
        roles: [{ name: 'Viewer', permissions: [{ code: 'PRODUCT_VIEW' }] }],
      };
      expect(() => guard.canActivate(createContext(viewer))).toThrow(ForbiddenException);
    });

    it('allows Super Admin regardless of explicit permission list', () => {
      const reflector = {
        getAllAndOverride: () => ['USER_DELETE'],
      } as unknown as Reflector;
      const guard = new PermissionsGuard(reflector);
      const superAdmin = {
        roles: [{ name: 'Super Admin', permissions: [] }],
      };
      expect(guard.canActivate(createContext(superAdmin))).toBe(true);
    });
  });

  describe('NotificationsService IDOR protection', () => {
    it('blocks marking another user notification as read', async () => {
      const repo = {
        findOneBy: jest.fn().mockResolvedValue({
          id: 'notif-1',
          recipientId: 'user-owner',
          recipientRole: null,
          isRead: false,
        }),
        save: jest.fn(),
      };
      const service = new NotificationsService(repo as any);
      const otherUser = { id: 'user-attacker', roles: [{ name: 'Viewer' }] } as any;

      await expect(service.markRead('notif-1', otherUser)).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows recipient user or matching role to mark notification as read', async () => {
      const notif = {
        id: 'notif-2',
        recipientId: null,
        recipientRole: 'Manager',
        isRead: false,
      };
      const repo = {
        findOneBy: jest.fn().mockResolvedValue(notif),
        save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      };
      const service = new NotificationsService(repo as any);
      const manager = { id: 'user-mgr', roles: [{ name: 'Manager' }] } as any;

      const updated = await service.markRead('notif-2', manager);
      expect(updated.isRead).toBe(true);
    });
  });

  describe('UsersService passwordHash sanitization', () => {
    it('never returns passwordHash from create or update', async () => {
      const existingUser = {
        id: 'u-1',
        email: 'a@factory.com',
        fullName: 'User A',
        passwordHash: '$2b$10$hashed',
        roles: [{ id: 'r-1', name: 'Viewer', permissions: [] }],
        isActive: true,
      };
      const userRepo = {
        findOneBy: jest.fn().mockResolvedValue(null),
        findOne: jest.fn().mockResolvedValue(existingUser),
        create: jest.fn().mockImplementation((x) => ({ id: 'u-2', ...x })),
        save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      };
      const roleRepo = {
        findOneBy: jest.fn().mockResolvedValue({ id: 'r-1', name: 'Viewer' }),
      };
      const permRepo = {};
      const service = new UsersService(userRepo as any, roleRepo as any, permRepo as any);

      const created = await service.create({
        email: 'new@factory.com',
        password: 'StrongPassword123!',
        fullName: 'New User',
        roleNames: ['Viewer'],
      });
      expect((created as any).passwordHash).toBeUndefined();

      const updated = await service.update('u-1', { fullName: 'Updated Name' });
      expect((updated as any).passwordHash).toBeUndefined();
    });
  });

  describe('AuthService.changePassword', () => {
    const createMockUserRepo = (user: any) => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      return {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      };
    };

    it('rejects incorrect current password', async () => {
      const hash = await bcrypt.hash('OldPass123!', 10);
      const repo = createMockUserRepo({ id: 'u-1', passwordHash: hash, isActive: true });
      const auth = new AuthService(repo as any, {} as any);

      await expect(auth.changePassword('u-1', 'WrongPass!', 'NewPass123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects reusing the same password', async () => {
      const hash = await bcrypt.hash('SamePass123!', 10);
      const repo = createMockUserRepo({ id: 'u-1', passwordHash: hash, isActive: true });
      const auth = new AuthService(repo as any, {} as any);

      await expect(auth.changePassword('u-1', 'SamePass123!', 'SamePass123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates password hash, increments tokenVersion, and returns a fresh token', async () => {
      const oldHash = await bcrypt.hash('OldPass123!', 10);
      const userObj = { id: 'u-1', email: 'u1@factory.com', passwordHash: oldHash, isActive: true, tokenVersion: 0 };
      const repo = createMockUserRepo(userObj);
      const jwtService = { sign: jest.fn().mockReturnValue('fresh-jwt') };
      const auth = new AuthService(repo as any, jwtService as any);

      const res = await auth.changePassword('u-1', 'OldPass123!', 'NewStrongPass123!');
      expect(res).toEqual({
        status: 'success',
        message: 'Password changed successfully',
        accessToken: 'fresh-jwt',
      });
      expect(userObj.tokenVersion).toBe(1);
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'u1@factory.com',
        sub: 'u-1',
        tokenVersion: 1,
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(await bcrypt.compare('NewStrongPass123!', userObj.passwordHash)).toBe(true);
    });

    it('revokes tokens on logout by incrementing tokenVersion', async () => {
      const repo = { increment: jest.fn().mockResolvedValue({ affected: 1 }) };
      const auth = new AuthService(repo as any, {} as any);

      const res = await auth.logout('u-1');
      expect(repo.increment).toHaveBeenCalledWith({ id: 'u-1' }, 'tokenVersion', 1);
      expect(res).toEqual({ status: 'success', message: 'Logged out successfully' });
    });

    it('rejects revoked JWTs whose tokenVersion does not match the database user', async () => {
      const config = {
        get: (key: string) => (key === 'JWT_SECRET' ? 'very-strong-test-secret-key' : undefined),
      } as unknown as ConfigService;
      const userRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'u-1', email: 'u1@factory.com', isActive: true, tokenVersion: 2 }),
      };
      const strategy = new JwtStrategy(config, userRepo as any);

      await expect(strategy.validate({ sub: 'u-1', email: 'u1@factory.com', tokenVersion: 1 })).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate({ sub: 'u-1', email: 'u1@factory.com', tokenVersion: 2 })).resolves.toMatchObject({
        id: 'u-1',
      });
    });
  });

  describe('DatabaseSeedService controls', () => {
    it('skips demo user creation when ENABLE_DEMO_SEED is false', async () => {
      const config = {
        get: (key: string, def?: any) => (key === 'ENABLE_DEMO_SEED' ? 'false' : def),
      } as unknown as ConfigService;
      const userRepo = { findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() };
      const noopRepo = {} as any;
      const seed = new DatabaseSeedService(
        config,
        noopRepo,
        noopRepo,
        userRepo as any,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
        noopRepo,
      );

      await (seed as any).seedUsers({});
      expect(userRepo.findOneBy).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Numeric & bounds validation across business services', () => {
    it('rejects empty or negative Purchase Request items', async () => {
      const prService = new PurchasingService(
        { count: jest.fn().mockResolvedValue(0) } as any,
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
        {} as any,
      );

      await expect(prService.createPR({ id: 'u-1' } as any, [])).rejects.toThrow(BadRequestException);
      await expect(
        prService.createPR({ id: 'u-1' } as any, [
          { productId: 'p-1', quantity: -5, estimatedPrice: 10 },
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prService.createPR({ id: 'u-1' } as any, [
          { productId: 'p-1', quantity: 5, estimatedPrice: -1 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty or negative Sales Order items', async () => {
      const salesService = new SalesService(
        { count: jest.fn().mockResolvedValue(0) } as any,
        {} as any,
        {} as any,
        { findOneBy: jest.fn().mockResolvedValue({ id: 'c-1' }) } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await expect(salesService.createOrder({ id: 'u-1' } as any, 'c-1', [])).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        salesService.createOrder({ id: 'u-1' } as any, 'c-1', [
          { productId: 'p-1', quantity: 0, price: 100 },
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
        {} as any,
      );

      await expect(
        prodService.createBOM({ code: 'BOM-1', productId: 'p-1', items: [] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.createPlan({
          productId: 'p-1',
          targetQuantity: 0,
          startDate: new Date('2026-11-10'),
          endDate: new Date('2026-11-12'),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.createPlan({
          productId: 'p-1',
          targetQuantity: 10,
          startDate: new Date('2026-11-15'),
          endDate: new Date('2026-11-12'),
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        prodService.reportResult('wo-1', -1, 0, '', { id: 'u-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UsersService privilege escalation guards', () => {
    const adminActor = {
      id: 'admin-1',
      roles: [
        {
          name: 'Admin',
          permissions: [{ code: 'USER_VIEW' }, { code: 'USER_CREATE' }, { code: 'USER_UPDATE' }],
        },
      ],
    } as any;
    const superAdminActor = { id: 'sa-1', roles: [{ name: 'Super Admin', permissions: [] }] } as any;

    it('blocks non-Super Admin from creating a Super Admin or higher-privilege role', async () => {
      const userRepo = { findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() };
      const roleRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'r-mgr',
          name: 'Manager',
          permissions: [{ code: 'PURCHASE_APPROVE' }],
        }),
      };
      const service = new UsersService(userRepo as any, roleRepo as any, {} as any);

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
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('blocks non-Super Admin from modifying higher-privilege users or changing own roles', async () => {
      const targetSuperAdmin = {
        id: 'sa-1',
        email: 'sa@factory.com',
        roles: [{ id: 'r-sa', name: 'Super Admin', permissions: [] }],
      };
      const targetManager = {
        id: 'mgr-1',
        email: 'mgr@factory.com',
        roles: [{ id: 'r-mgr', name: 'Manager', permissions: [{ code: 'PURCHASE_APPROVE' }] }],
      };
      const targetSelfAdmin = {
        id: 'admin-1',
        email: 'admin@factory.com',
        roles: [{ id: 'r-ad', name: 'Admin', permissions: [{ code: 'USER_UPDATE' }] }],
      };
      const userRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(targetSuperAdmin)
          .mockResolvedValueOnce(targetManager)
          .mockResolvedValueOnce(targetSelfAdmin)
          .mockResolvedValueOnce(targetSuperAdmin),
        save: jest.fn(),
        remove: jest.fn(),
      };
      const service = new UsersService(userRepo as any, {} as any, {} as any);

      await expect(service.update('sa-1', { fullName: 'Hacked' }, adminActor)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('mgr-1', { password: 'NewPassword123!' }, adminActor)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.update('admin-1', { roleNames: ['Super Admin'] }, adminActor),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.remove('sa-1', adminActor)).rejects.toThrow(ForbiddenException);
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(userRepo.remove).not.toHaveBeenCalled();
    });

    it('increments tokenVersion and strips sensitive fields when password or active status changes', async () => {
      const targetUser = {
        id: 'u-viewer',
        email: 'sub@factory.com',
        tokenVersion: 3,
        isActive: true,
        roles: [{ id: 'r-sub', name: 'Limited', permissions: [{ code: 'USER_VIEW' }] }],
      };
      const userRepo = {
        findOne: jest.fn().mockResolvedValue(targetUser),
        save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      };
      const service = new UsersService(userRepo as any, {} as any, {} as any);

      const updated = await service.update('u-viewer', { password: 'NewStrongPassword1!' }, adminActor);
      expect(targetUser.tokenVersion).toBe(4);
      expect((updated as any).passwordHash).toBeUndefined();
      expect((updated as any).tokenVersion).toBeUndefined();
    });

    it('allows Super Admin to assign Super Admin role and modify users', async () => {
      const userRepo = {
        findOneBy: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((x) => ({ id: 'u-sa', ...x })),
        save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      };
      const roleRepo = {
        findOneBy: jest.fn().mockResolvedValue({ id: 'r-sa', name: 'Super Admin' }),
      };
      const service = new UsersService(userRepo as any, roleRepo as any, {} as any);

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
