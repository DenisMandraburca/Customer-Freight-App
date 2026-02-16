import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import type { FreightRepository } from '@antigravity/db';

import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import { checkCompanyDomain } from './middleware/checkCompanyDomain.js';
import { errorHandler } from './middleware/errors.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { greenbushRouter } from './routes/greenbush.js';
import { loadsRouter } from './routes/loads.js';

export function createApp(repository: FreightRepository): express.Express {
  const app = express();

  app.use(
    cors({
      origin: [config.appUrl],
      credentials: true,
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'antigravity-api' });
  });

  app.use('/api/auth', authRouter(repository));

  app.get('/api/me', requireAuth(repository), checkCompanyDomain, (req, res) => {
    res.json({ data: req.user });
  });

  app.use('/api', requireAuth(repository), checkCompanyDomain);

  app.get('/api/initial-data', async (req, res, next) => {
    try {
      const currentUser = req.user!;
      const [loads, customers, greenbush] = await Promise.all([
        repository.listLoads({}),
        repository.listCustomers(),
        repository.listGreenbush(),
      ]);

      const includeUsers = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
      const users = includeUsers ? await repository.listUsers() : undefined;

      res.json({
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

  app.use('/api', loadsRouter(repository));
  app.use('/api', greenbushRouter(repository));
  app.use('/api', adminRouter(repository));

  app.use(errorHandler);

  return app;
}
