import { Router } from 'express';
import { z } from 'zod';

import { HttpError, type FreightRepository } from '@antigravity/db';
import { USER_ROLES } from '@antigravity/shared';

import { requireRoles } from '../middleware/auth.js';
import { assertCompanyDomain } from '../middleware/checkCompanyDomain.js';
import { asyncHandler } from '../middleware/errors.js';

const customerSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(['Direct Customer', 'Broker']),
  quoteAccept: z.boolean().default(false),
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  role: z.enum(USER_ROLES),
  fullLoadAccess: z.boolean().optional(),
});

const bulkRowsSchema = z.object({
  rows: z.array(z.record(z.string())),
});

type BulkImportError = {
  row: number;
  message: string;
};

function ensureCustomersAccess(user: { role: string; full_load_access: boolean }): void {
  if (user.role === 'ACCOUNT_MANAGER' && !user.full_load_access) {
    throw new HttpError(
      'Account managers without full access cannot manage customers.',
      403,
      'PERMISSION_DENIED',
    );
  }
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function normalizeRoleInput(raw: string): (typeof USER_ROLES)[number] {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (!USER_ROLES.includes(normalized as (typeof USER_ROLES)[number])) {
    throw new HttpError(`Invalid role: ${raw}`, 400, 'VALIDATION_ERROR');
  }
  return normalized as (typeof USER_ROLES)[number];
}

function normalizeCustomerType(raw: string): 'Direct Customer' | 'Broker' {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'direct customer' || normalized === 'direct') {
    return 'Direct Customer';
  }
  if (normalized === 'broker') {
    return 'Broker';
  }
  throw new HttpError(`Invalid customer type: ${raw}`, 400, 'VALIDATION_ERROR');
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Invalid row payload';
}

export function adminRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get(
    ['/admin/customers', '/customers'],
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      ensureCustomersAccess(req.user!);
      const customers = await repository.listCustomers();
      res.json({ success: true, data: customers });
    }),
  );

  router.post(
    ['/admin/customers', '/customers'],
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      ensureCustomersAccess(req.user!);
      const payload = customerSchema.parse(req.body);
      const customer = await repository.createCustomer(payload);
      res.status(201).json({ success: true, data: customer });
    }),
  );

  router.post(
    ['/admin/customers/bulk', '/customers/bulk'],
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      ensureCustomersAccess(req.user!);
      const parsed = bulkRowsSchema.parse(req.body);

      const errors: BulkImportError[] = [];
      let importedCount = 0;

      for (const [index, row] of parsed.rows.entries()) {
        try {
          const name = (row.Name ?? row.name ?? '').trim();
          const type = normalizeCustomerType(row.Type ?? row.type ?? '');
          const quoteAccept = parseBoolean(row.Quote_Accept ?? row.quote_accept);

          if (!name) {
            throw new HttpError('Name is required.', 400, 'VALIDATION_ERROR');
          }

          await repository.createCustomer({
            name,
            type,
            quoteAccept,
          });
          importedCount += 1;
        } catch (error) {
          errors.push({
            row: index + 2,
            message: toErrorMessage(error),
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalRows: parsed.rows.length,
          importedCount,
          failedCount: errors.length,
          errors,
        },
      });
    }),
  );

  router.patch(
    ['/admin/customers/:id', '/customers/:id'],
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      ensureCustomersAccess(req.user!);
      const payload = customerSchema.parse(req.body);
      const customer = await repository.updateCustomer(req.params.id, payload);
      res.json({ success: true, data: customer });
    }),
  );

  router.delete(
    ['/admin/customers/:id', '/customers/:id'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      await repository.deleteCustomer(req.params.id);
      res.status(204).send();
    }),
  );

  router.get(
    ['/admin/users', '/users'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (_req, res) => {
      const users = await repository.listUsers();
      res.json({ success: true, data: users });
    }),
  );

  router.post(
    ['/admin/users', '/users'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      const payload = userSchema.parse(req.body);
      assertCompanyDomain(payload.email);
      const user = await repository.createUser(payload);
      res.status(201).json({ success: true, data: user });
    }),
  );

  router.post(
    ['/admin/users/bulk', '/users/bulk'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      const parsed = bulkRowsSchema.parse(req.body);

      const errors: BulkImportError[] = [];
      let importedCount = 0;

      for (const [index, row] of parsed.rows.entries()) {
        try {
          const email = (row.Email ?? row.email ?? '').trim().toLowerCase();
          const name = (row.Name ?? row.name ?? '').trim();
          const role = normalizeRoleInput(row.Role ?? row.role ?? '');
          const fullLoadAccess = parseBoolean(row.Full_Load_Access ?? row.full_load_access);

          const payload = userSchema.parse({
            email,
            name,
            role,
            fullLoadAccess: role === 'ACCOUNT_MANAGER' ? fullLoadAccess : undefined,
          });

          assertCompanyDomain(payload.email);

          await repository.createUser(payload);
          importedCount += 1;
        } catch (error) {
          errors.push({
            row: index + 2,
            message: toErrorMessage(error),
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalRows: parsed.rows.length,
          importedCount,
          failedCount: errors.length,
          errors,
        },
      });
    }),
  );

  router.patch(
    ['/admin/users/:id', '/users/:id'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      const current = await repository.getUserById(req.params.id);
      if (!current) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }

      const payload = userSchema.parse(req.body);
      assertCompanyDomain(payload.email);

      const user = await repository.updateUser(req.params.id, payload);
      res.json({ success: true, data: user });
    }),
  );

  router.delete(
    ['/admin/users/:id', '/users/:id'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      const current = await repository.getUserById(req.params.id);
      if (!current) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }

      await repository.deleteUser(req.params.id);
      res.status(204).send();
    }),
  );

  router.post(
    ['/admin/users/:id/ban', '/users/:id/ban'],
    requireRoles(['ADMIN', 'MANAGER']),
    asyncHandler(async (req, res) => {
      const current = await repository.getUserById(req.params.id);
      if (!current) {
        throw new HttpError('User not found.', 404, 'NOT_FOUND');
      }

      const user = await repository.banUser(req.params.id);
      res.json({ success: true, data: user });
    }),
  );

  return router;
}
