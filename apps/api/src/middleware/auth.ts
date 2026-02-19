import type { NextFunction, Request, Response } from 'express';

import type { FreightRepository } from '@antigravity/db';
import type { UserRole } from '@antigravity/shared';

import { ACCESS_PERMISSION, ADMIN_PERMISSION } from '../config.js';

function normalizeRole(role: UserRole): UserRole {
  return role === 'MANAGER' ? 'ADMIN' : role;
}

function sendAuthError(
  res: Response,
  status: number,
  error: string,
  message: string,
): void {
  res.status(status).json({
    success: false,
    error,
    message,
  });
}

function hasModuleAccess(session: NonNullable<Request['userSession']>): boolean {
  if (session.isSuperAdmin) {
    return true;
  }

  const permissions = new Set(session.permissions ?? []);
  return permissions.has(ACCESS_PERMISSION) || permissions.has(ADMIN_PERMISSION);
}

function hasAdminPermission(session: NonNullable<Request['userSession']>): boolean {
  if (session.isSuperAdmin) {
    return true;
  }

  return (session.permissions ?? []).includes(ADMIN_PERMISSION);
}

export function requirePortalSession() {
  return function requirePortalSessionMiddleware(req: Request, res: Response, next: NextFunction): void {
    const session = req.userSession;

    if (!session) {
      sendAuthError(res, 401, 'UNAUTHORIZED', 'Authentication is required.');
      return;
    }

    if (!session.email || !session.id) {
      sendAuthError(res, 401, 'UNAUTHORIZED', 'Invalid user session.');
      return;
    }

    if (!hasModuleAccess(session)) {
      sendAuthError(res, 403, 'PERMISSION_DENIED', 'Missing module permission.');
      return;
    }

    next();
  };
}

export function resolveAppUserContext(repository: FreightRepository) {
  return async function resolveAppUserContextMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const session = req.userSession;
    if (!session) {
      sendAuthError(res, 401, 'UNAUTHORIZED', 'Authentication is required.');
      return;
    }

    try {
      const sessionEmail = session.email.trim().toLowerCase();
      const sessionName = (session.name ?? session.email).trim() || session.email;
      let dbUser = await repository.getUserByEmail(sessionEmail);

      if (!dbUser) {
        dbUser = await repository.createUser({
          email: sessionEmail,
          name: sessionName,
          role: 'VIEWER',
          fullLoadAccess: false,
        });
      }

      if (dbUser.role === 'BANNED') {
        sendAuthError(res, 403, 'PERMISSION_DENIED', 'Access denied. User is banned.');
        return;
      }

      const effectiveRole: UserRole = hasAdminPermission(session) ? 'ADMIN' : dbUser.role;

      req.user = {
        sub: dbUser.id,
        email: dbUser.email,
        role: effectiveRole,
        name: dbUser.name,
        full_load_access: dbUser.full_load_access,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRoles(allowedRoles: UserRole[]) {
  const roleSet = new Set<UserRole>(allowedRoles.map(normalizeRole));

  return function requireRoleMiddleware(req: Request, res: Response, next: NextFunction): void {
    const role = req.user?.role;

    if (!role || !roleSet.has(normalizeRole(role))) {
      sendAuthError(res, 403, 'PERMISSION_DENIED', 'Forbidden for this role.');
      return;
    }

    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return requireRoles(roles);
}
