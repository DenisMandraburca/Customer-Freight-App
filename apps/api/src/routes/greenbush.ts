import { Router } from 'express';
import { z } from 'zod';

import type { FreightRepository } from '@antigravity/db';

import { requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const quoteSchema = z.object({
  greenbushId: z.string().uuid(),
  pickupDate: z.string().trim().min(1),
  truckNumber: z.string().trim().min(1),
  driverName: z.string().trim().optional(),
});

const greenbushMutationSchema = z.object({
  pickupLocation: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  receivingHours: z.string().trim().optional(),
  price: z.number().nonnegative(),
  tarp: z.string().trim().optional(),
  remainingCount: z.number().int().nonnegative(),
  specialNotes: z.string().trim().optional(),
});

const greenbushBulkReplaceSchema = z.object({
  rows: z.array(greenbushMutationSchema).min(1),
});

export function greenbushRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get(
    '/greenbush',
    asyncHandler(async (_req, res) => {
      const rows = await repository.listGreenbush();
      res.json({ success: true, data: rows });
    }),
  );

  router.post(
      '/greenbush/quote',
    requireRoles(['DISPATCHER', 'MANAGER', 'ADMIN', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      const parsed = quoteSchema.parse(req.body);
      const load = await repository.createGreenbushQuote({
        ...parsed,
        dispatcherId: req.user!.sub,
      });
      res.status(201).json({ success: true, data: load });
    }),
  );

  router.post(
    '/greenbush',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = greenbushMutationSchema.parse(req.body);
      const row = await repository.createGreenbush(parsed);
      res.status(201).json({ success: true, data: row });
    }),
  );

  router.patch(
    '/greenbush/:id',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = greenbushMutationSchema.parse(req.body);
      const row = await repository.updateGreenbush(req.params.id, parsed);
      res.json({ success: true, data: row });
    }),
  );

  router.post(
    '/greenbush/:id/increment',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const row = await repository.incrementGreenbush(req.params.id);
      res.json({ success: true, data: row });
    }),
  );

  router.delete(
    '/greenbush/:id',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      await repository.deleteGreenbush(req.params.id);
      res.status(204).send();
    }),
  );

  router.post(
    ['/greenbush/bulk', '/greenbush/bulk-replace'],
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = greenbushBulkReplaceSchema.parse(req.body);
      const rows = await repository.bulkReplaceGreenbush(parsed.rows);
      res.json({ success: true, data: rows });
    }),
  );

  return router;
}
