import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import type { FreightRepository, LoadRecord } from '@antigravity/db';
import type { UserRole } from '@antigravity/shared';

import { config } from './config.js';
import { logger } from './logger.js';
import { requirePortalSession, resolveAppUserContext } from './middleware/auth.js';
import { checkCompanyDomain } from './middleware/checkCompanyDomain.js';
import { errorHandler } from './middleware/errors.js';
import { adminRouter } from './routes/admin.js';
import { chatRouter } from './routes/chat.js';
import { greenbushRouter } from './routes/greenbush.js';
import { loadsRouter } from './routes/loads.js';

export interface CreateAppOptions {
  portalSessionMiddleware?: express.RequestHandler;
}

function normalizeRole(role: UserRole): UserRole {
  return role === 'MANAGER' ? 'ADMIN' : role;
}

function scopeLoadsByRole(
  user: { sub: string; role: UserRole; full_load_access: boolean },
  loads: LoadRecord[],
): LoadRecord[] {
  const normalized = normalizeRole(user.role);

  if (normalized === 'ADMIN') {
    return loads;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    if (user.full_load_access) {
      return loads;
    }

    return loads.filter((load) => load.account_manager_id === user.sub || load.status === 'AVAILABLE');
  }

  if (user.role === 'DISPATCHER') {
    return loads.filter((load) => load.assigned_dispatcher_id === user.sub || load.status === 'AVAILABLE');
  }

  if (user.role === 'VIEWER') {
    return loads.filter((load) => load.status === 'AVAILABLE');
  }

  return [];
}

export function createApp(repository: FreightRepository, options: CreateAppOptions = {}): express.Express {
  const app = express();
  const apiBasePath = config.apiBasePath;

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(helmet());

  if (config.nodeEnv !== 'production') {
    app.use(
      cors({
        origin: [config.appUrl],
        credentials: true,
      }),
    );
  }

  app.use(express.json({ limit: '1mb' }));

  if (options.portalSessionMiddleware) {
    app.use(options.portalSessionMiddleware);
  }

  app.get(`${apiBasePath}/health`, (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(apiBasePath, requirePortalSession(), checkCompanyDomain, resolveAppUserContext(repository));

  app.get(`${apiBasePath}/me`, (req, res) => {
    res.json({ success: true, data: req.user });
  });

  app.get(`${apiBasePath}/initial-data`, async (req, res, next) => {
    try {
      const currentUser = req.user!;
      const [allLoads, allCustomers, allGreenbush] = await Promise.all([
        repository.listLoads({}),
        repository.listCustomers(),
        repository.listGreenbush(),
      ]);

      const normalizedRole = normalizeRole(currentUser.role);
      const includeUsers = normalizedRole === 'ADMIN';
      const users = includeUsers ? await repository.listUsers() : undefined;

      const loads = scopeLoadsByRole(currentUser, allLoads);
      const customers =
        normalizedRole === 'ADMIN' ||
        (currentUser.role === 'ACCOUNT_MANAGER' && currentUser.full_load_access)
          ? allCustomers
          : [];
      const greenbush =
        normalizedRole === 'ADMIN' || currentUser.role === 'ACCOUNT_MANAGER' || currentUser.role === 'DISPATCHER'
          ? allGreenbush
          : [];

      res.json({
        success: true,
        data: {
          currentUser,
          loads,
          customers,
          users,
          greenbush,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(apiBasePath, loadsRouter(repository));
  app.use(apiBasePath, chatRouter(repository));
  app.use(apiBasePath, greenbushRouter(repository));
  app.use(apiBasePath, adminRouter(repository));

  app.use(errorHandler);

  return app;
}
