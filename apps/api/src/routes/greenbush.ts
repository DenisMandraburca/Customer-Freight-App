import { Router } from 'express';
import { z } from 'zod';

import type { FreightRepository } from '@antigravity/db';

import { asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';

const quoteSchema = z.object({
  greenbushId: z.string().uuid(),
  pickupDate: z.string().min(1),
  truckNumber: z.string().min(1),
  driverName: z.string().optional(),
});

const greenbushMutationSchema = z.object({
  pickupLocation: z.string().min(1),
  destination: z.string().min(1),
  receivingHours: z.string().optional(),
  price: z.number().nonnegative(),
  tarp: z.string().optional(),
  remainingCount: z.number().int().nonnegative(),
  specialNotes: z.string().optional(),
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
      res.json({ data: rows });
    }),
  );

  router.post(
    '/greenbush/quote',
    requireRole('DISPATCHER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = quoteSchema.parse(req.body);
      const load = await repository.createGreenbushQuote({
        ...parsed,
        dispatcherId: req.user!.sub,
      });
      res.status(201).json({ data: load });
    }),
  );

  router.post(
    '/greenbush/:id/increment',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const row = await repository.incrementGreenbush(req.params.id);
      res.json({ data: row });
    }),
  );

  router.post(
    '/greenbush',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = greenbushMutationSchema.parse(req.body);
      const row = await repository.createGreenbush(parsed);
      res.status(201).json({ data: row });
    }),
  );

  router.patch(
    '/greenbush/:id',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = greenbushMutationSchema.parse(req.body);
      const row = await repository.updateGreenbush(req.params.id, parsed);
      res.json({ data: row });
    }),
  );

  router.post(
    '/greenbush/bulk-replace',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = greenbushBulkReplaceSchema.parse(req.body);
      const rows = await repository.bulkReplaceGreenbush(parsed.rows);
      res.json({ data: rows });
    }),
  );

  return router;
}
