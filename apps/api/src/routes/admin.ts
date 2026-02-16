import { Router } from 'express';
import { z } from 'zod';

import type { FreightRepository } from '@antigravity/db';
import { USER_ROLES } from '@antigravity/shared';

import { requireRole } from '../middleware/auth.js';
import { assertCompanyDomain } from '../middleware/checkCompanyDomain.js';
import { asyncHandler } from '../middleware/errors.js';

const customerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['Direct Customer', 'Broker']),
  quoteAccept: z.boolean().default(false),
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export function adminRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get(
    '/customers',
    asyncHandler(async (_req, res) => {
      const customers = await repository.listCustomers();
      res.json({ data: customers });
    }),
  );

  router.post(
    '/customers',
    requireRole('ADMIN', 'MANAGER', 'ACCOUNT_MANAGER'),
    asyncHandler(async (req, res) => {
      const payload = customerSchema.parse(req.body);
      const customer = await repository.createCustomer(payload);
      res.status(201).json({ data: customer });
    }),
  );

  router.patch(
    '/customers/:id',
    requireRole('ADMIN', 'MANAGER', 'ACCOUNT_MANAGER'),
    asyncHandler(async (req, res) => {
      const payload = customerSchema.parse(req.body);
      const customer = await repository.updateCustomer(req.params.id, payload);
      res.json({ data: customer });
    }),
  );

  router.delete(
    '/customers/:id',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (req, res) => {
      await repository.deleteCustomer(req.params.id);
      res.status(204).send();
    }),
  );

  router.get(
    '/users',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (_req, res) => {
      const users = await repository.listUsers();
      res.json({ data: users });
    }),
  );

  router.post(
    '/users',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (req, res) => {
      const payload = userSchema.parse(req.body);
      assertCompanyDomain(payload.email);
      const user = await repository.createUser(payload);
      res.status(201).json({ data: user });
    }),
  );

  router.patch(
    '/users/:id',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (req, res) => {
      const payload = userSchema.parse(req.body);
      assertCompanyDomain(payload.email);
      const user = await repository.updateUser(req.params.id, payload);
      res.json({ data: user });
    }),
  );

  router.delete(
    '/users/:id',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (req, res) => {
      await repository.deleteUser(req.params.id);
      res.status(204).send();
    }),
  );

  router.post(
    '/users/:id/ban',
    requireRole('ADMIN', 'MANAGER'),
    asyncHandler(async (req, res) => {
      const user = await repository.banUser(req.params.id);
      res.json({ data: user });
    }),
  );

  return router;
}
