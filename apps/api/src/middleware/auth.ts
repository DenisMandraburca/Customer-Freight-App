import type { NextFunction, Request, Response } from 'express';

import type { FreightRepository } from '@antigravity/db';
import type { UserRole } from '@antigravity/shared';

import { SESSION_COOKIE_NAME } from '../config.js';
import { verifySession } from '../security.js';

export function requireAuth(repository: FreightRepository) {
  return async function requireAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

      if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = verifySession(token);
      const dbUser = await repository.getUserById(session.sub);

      if (!dbUser) {
        res.status(401).json({ error: 'Session user no longer exists.' });
        return;
      }

      if (dbUser.role === 'BANNED') {
        res.status(403).json({ error: 'Access denied. User is banned.' });
        return;
      }

      req.user = {
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
      };

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired session.' });
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  const roleSet = new Set<UserRole>(roles);

  return function requireRoleMiddleware(req: Request, res: Response, next: NextFunction): void {
    const role = req.user?.role;

    if (!role || !roleSet.has(role)) {
      res.status(403).json({ error: 'Forbidden for this role.' });
      return;
    }

    next();
  };
}