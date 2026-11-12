import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { resolveJwtSecret } from './jwt-secret.util';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

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
});
