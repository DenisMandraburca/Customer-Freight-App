import { Router } from 'express';
import { z } from 'zod';

import type { FreightRepository } from '@antigravity/db';
import { LOAD_STATUSES } from '@antigravity/shared';

import { asyncHandler } from '../middleware/errors.js';
import { requireRole } from '../middleware/auth.js';

const loadStatusSchema = z.enum(LOAD_STATUSES);

const createLoadSchema = z.object({
  customerId: z.string().uuid(),
  accountManagerId: z.string().uuid().optional(),
  loadRefNumber: z.string().min(1),
  mcleodOrderId: z.string().optional(),
  puCity: z.string().min(1),
  puState: z.string().min(2).max(2),
  puZip: z.string().optional(),
  puDate: z.string().optional(),
  puApptTime: z.string().optional(),
  puAppt: z.boolean().optional(),
  delCity: z.string().min(1),
  delState: z.string().min(2).max(2),
  delZip: z.string().optional(),
  delDate: z.string().optional(),
  delApptTime: z.string().optional(),
  delAppt: z.boolean().optional(),
  rate: z.number().finite(),
  miles: z.number().finite().positive(),
  notes: z.string().optional(),
  status: loadStatusSchema.optional(),
});

const bookSchema = z.object({
  loadId: z.string().uuid(),
  truckNumber: z.string().min(1),
  driverName: z.string().min(1),
});

const quoteSchema = z.object({
  pickupDate: z.string().min(1),
});

const decideSchema = z.object({
  loadId: z.string().uuid(),
  decision: z.enum(['accept', 'deny']),
  notes: z.string().optional(),
  requestedPickupDate: z.string().optional(),
  newDeliveryDate: z.string().optional(),
  loadRefNumber: z.string().optional(),
  mcleodOrderId: z.string().optional(),
});

const statusSchema = z.object({
  status: loadStatusSchema,
  reason: z.string().optional(),
});

const updateLoadSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
  loadRefNumber: z.string().optional(),
  mcleodOrderId: z.string().nullable().optional(),
  puCity: z.string().optional(),
  puState: z.string().optional(),
  puZip: z.string().nullable().optional(),
  puDate: z.string().nullable().optional(),
  puApptTime: z.string().nullable().optional(),
  puAppt: z.boolean().optional(),
  delCity: z.string().optional(),
  delState: z.string().optional(),
  delZip: z.string().nullable().optional(),
  delDate: z.string().nullable().optional(),
  delApptTime: z.string().nullable().optional(),
  delAppt: z.boolean().optional(),
  rate: z.number().finite().optional(),
  miles: z.number().finite().optional(),
  notes: z.string().nullable().optional(),
  status: loadStatusSchema.optional(),
  assignedDispatcherId: z.string().uuid().nullable().optional(),
  driverName: z.string().nullable().optional(),
  truckNumber: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  otherNotes: z.string().nullable().optional(),
  delayReason: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  denyQuoteReason: z.string().nullable().optional(),
  requestedPickupDate: z.string().nullable().optional(),
});

export function loadsRouter(repository: FreightRepository): Router {
  const router = Router();

  function normalizeStatusQuery(raw: string): (typeof LOAD_STATUSES)[number] | undefined {
    const normalized = raw.trim().toUpperCase();
    if (normalized === 'PENDING') {
      return 'PENDING_APPROVAL';
    }
    return LOAD_STATUSES.includes(normalized as (typeof LOAD_STATUSES)[number])
      ? (normalized as (typeof LOAD_STATUSES)[number])
      : undefined;
  }

  router.get(
    '/loads',
    asyncHandler(async (req, res) => {
      const loads = await repository.listLoads({
        status: typeof req.query.status === 'string' ? normalizeStatusQuery(req.query.status) : undefined,
        customer: typeof req.query.customer === 'string' ? req.query.customer : undefined,
        dispatcher: typeof req.query.dispatcher === 'string' ? req.query.dispatcher : undefined,
        accountManager: typeof req.query.accountManager === 'string' ? req.query.accountManager : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
      });

      res.json({ data: loads });
    }),
  );

  router.post(
    '/loads',
    requireRole('ACCOUNT_MANAGER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = createLoadSchema.parse(req.body);

      const load = await repository.createLoad({
        ...parsed,
        accountManagerId: parsed.accountManagerId ?? req.user!.sub,
      });

      res.status(201).json({ data: load });
    }),
  );

  router.post(
    '/book',
    requireRole('DISPATCHER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = bookSchema.parse(req.body);
      const load = await repository.bookLoad({
        ...parsed,
        dispatcherId: req.user!.sub,
      });
      res.json({ data: load });
    }),
  );

  router.post(
    '/loads/:id/quote',
    requireRole('DISPATCHER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = quoteSchema.parse(req.body);
      const load = await repository.quoteLoad({
        loadId: req.params.id,
        dispatcherId: req.user!.sub,
        pickupDate: parsed.pickupDate,
      });
      res.status(201).json({ data: load });
    }),
  );

  router.post(
    '/loads/:id/decision',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = decideSchema.omit({ loadId: true }).parse(req.body);
      const load = await repository.decideLoad({
        loadId: req.params.id,
        ...parsed,
      });
      res.json({ data: load });
    }),
  );

  router.patch(
    '/loads/:id/status',
    requireRole('DISPATCHER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = statusSchema.parse(req.body);
      const load = await repository.updateLoadStatus(req.params.id, parsed.status, parsed.reason);
      res.json({ data: load });
    }),
  );

  router.patch(
    '/loads/:id',
    requireRole('ACCOUNT_MANAGER', 'MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = updateLoadSchema.parse(req.body);
      const load = await repository.updateLoad(req.params.id, parsed);
      res.json({ data: load });
    }),
  );

  // Compatibility aliases used by the current frontend during transition.
  router.post(
    '/decide',
    requireRole('MANAGER', 'ADMIN'),
    asyncHandler(async (req, res) => {
      const parsed = decideSchema.parse(req.body);
      const load = await repository.decideLoad(parsed);
      res.json({ data: load });
    }),
  );

  return router;
}
