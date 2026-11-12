import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User, extractUserAccess } from '../../database/entities';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      return false;
    }

    const { roleNames, permissions } = extractUserAccess(user);

    // Super Admin bypasses all permission checks
    if (roleNames.includes('Super Admin')) {
      return true;
    }

    const userPermissions = new Set<string>(permissions);

    const hasPermission = requiredPermissions.every((perm) => userPermissions.has(perm));
    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to perform this action');
    }

    return true;
  }
}
