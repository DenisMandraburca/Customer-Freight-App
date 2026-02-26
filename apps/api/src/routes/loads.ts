import { Router } from 'express';
import { z } from 'zod';

import { HttpError, type FreightRepository, type LoadRecord } from '@antigravity/db';
import { LOAD_STATUSES, type LoadStatus, type UserRole } from '@antigravity/shared';

import { requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const loadStatusSchema = z.enum(LOAD_STATUSES);

const createLoadSchema = z.object({
  customerId: z.string().uuid(),
  accountManagerId: z.string().uuid().nullable().optional(),
  loadRefNumber: z.string().trim().min(1).nullable().optional(),
  mcleodOrderId: z.string().trim().nullable().optional(),
  puCity: z.string().trim().min(1),
  puState: z.string().trim().min(2).max(2),
  puZip: z.string().trim().nullable().optional(),
  puDate: z.string().trim().nullable().optional(),
  puApptTime: z.string().trim().nullable().optional(),
  puAppt: z.boolean().optional(),
  delCity: z.string().trim().min(1),
  delState: z.string().trim().min(2).max(2),
  delZip: z.string().trim().nullable().optional(),
  delDate: z.string().trim().nullable().optional(),
  delApptTime: z.string().trim().nullable().optional(),
  delAppt: z.boolean().optional(),
  rate: z.number().finite().positive(),
  miles: z.number().finite().nonnegative(),
  notes: z.string().trim().nullable().optional(),
  assignedDispatcherId: z.string().uuid().nullable().optional(),
  driverName: z.string().trim().nullable().optional(),
  truckNumber: z.string().trim().nullable().optional(),
  status: loadStatusSchema.optional(),
});

const bulkRowsSchema = z.object({
  rows: z.array(z.record(z.string())),
});

const bookSchema = z.object({
  loadId: z.string().uuid().optional(),
  truckNumber: z.string().trim().min(1),
  driverName: z.string().trim().min(1),
});

const quoteSchema = z
  .object({
    pickupDate: z.string().trim().optional(),
    proposedDate: z.string().trim().optional(),
    proposed_date: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.pickupDate || value.proposedDate || value.proposed_date), {
    message: 'pickupDate is required.',
  });

const decideSchema = z.object({
  loadId: z.string().uuid().optional(),
  decision: z.enum(['accept', 'deny']),
  denyReason: z.string().trim().optional(),
  deny_reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  requestedPickupDate: z.string().trim().optional(),
  newDeliveryDate: z.string().trim().optional(),
  loadRefNumber: z.string().trim().optional(),
  mcleodOrderId: z.string().trim().optional(),
});

const statusSchema = z.object({
  status: loadStatusSchema,
  reason: z.string().trim().optional(),
});

const updateLoadSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
  loadRefNumber: z.string().trim().optional(),
  mcleodOrderId: z.string().trim().nullable().optional(),
  puCity: z.string().trim().optional(),
  puState: z.string().trim().optional(),
  puZip: z.string().trim().nullable().optional(),
  puDate: z.string().trim().nullable().optional(),
  puApptTime: z.string().trim().nullable().optional(),
  puAppt: z.boolean().optional(),
  delCity: z.string().trim().optional(),
  delState: z.string().trim().optional(),
  delZip: z.string().trim().nullable().optional(),
  delDate: z.string().trim().nullable().optional(),
  delApptTime: z.string().trim().nullable().optional(),
  delAppt: z.boolean().optional(),
  rate: z.number().finite().positive().optional(),
  miles: z.number().finite().nonnegative().optional(),
  notes: z.string().trim().nullable().optional(),
  status: loadStatusSchema.optional(),
  assignedDispatcherId: z.string().uuid().nullable().optional(),
  driverName: z.string().trim().nullable().optional(),
  truckNumber: z.string().trim().nullable().optional(),
  equipment: z.string().trim().nullable().optional(),
  otherNotes: z.string().trim().nullable().optional(),
  delayReason: z.string().trim().nullable().optional(),
  cancelReason: z.string().trim().nullable().optional(),
  denyQuoteReason: z.string().trim().nullable().optional(),
  requestedPickupDate: z.string().trim().nullable().optional(),
});

type BulkImportError = {
  row: number;
  message: string;
};

function normalizeStatusQuery(raw: string): LoadStatus | undefined {
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'PENDING') {
    return 'PENDING_APPROVAL';
  }

  return LOAD_STATUSES.includes(normalized as LoadStatus) ? (normalized as LoadStatus) : undefined;
}

function normalizeRole(role: UserRole): UserRole {
  return role === 'MANAGER' ? 'ADMIN' : role;
}

function isAdminLike(role: UserRole): boolean {
  return normalizeRole(role) === 'ADMIN';
}

function canManageLoadByOwnership(user: { sub: string; role: UserRole; full_load_access: boolean }, load: LoadRecord): boolean {
  if (isAdminLike(user.role)) {
    return true;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    if (user.full_load_access) {
      return true;
    }
    return load.account_manager_id === user.sub;
  }

  if (user.role === 'DISPATCHER') {
    return load.assigned_dispatcher_id === user.sub;
  }

  return false;
}

function scopeLoadsByRole(
  user: { sub: string; role: UserRole; full_load_access: boolean },
  loads: LoadRecord[],
): LoadRecord[] {
  if (isAdminLike(user.role)) {
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

function parseBoolean(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parseImportNumber(value: string | undefined): number {
  const normalized = (value ?? '').trim().replace(/[$,\s]/g, '');
  return Number(normalized);
}

function normalizeLoadStatusInput(raw: string): LoadStatus | undefined {
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'PENDING') {
    return 'PENDING_APPROVAL';
  }
  return LOAD_STATUSES.includes(normalized as LoadStatus) ? (normalized as LoadStatus) : undefined;
}

function validateMilesForStatus(miles: number, status: LoadStatus): void {
  if (!Number.isFinite(miles) || miles < 0) {
    throw new HttpError('Miles must be a non-negative number.', 400, 'VALIDATION_ERROR');
  }
  if (miles === 0 && status !== 'TONU') {
    throw new HttpError('Miles can be 0 only when status is TONU.', 400, 'VALIDATION_ERROR');
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Invalid row payload';
}

export function loadsRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get(
    '/loads',
    asyncHandler(async (req, res) => {
      const user = req.user!;
      if (user.role === 'BANNED') {
        throw new HttpError('Banned users cannot access loads.', 403, 'PERMISSION_DENIED');
      }

      const loads = await repository.listLoads({
        status: typeof req.query.status === 'string' ? normalizeStatusQuery(req.query.status) : undefined,
        customer: typeof req.query.customer === 'string' ? req.query.customer : undefined,
        dispatcher: typeof req.query.dispatcher === 'string' ? req.query.dispatcher : undefined,
        accountManager: typeof req.query.accountManager === 'string' ? req.query.accountManager : undefined,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        ref: typeof req.query.ref === 'string' ? req.query.ref : undefined,
      });

      const scoped = scopeLoadsByRole(user, loads);
      res.json({ success: true, data: scoped });
    }),
  );

  router.post(
    '/loads',
    requireRoles(['ACCOUNT_MANAGER', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = createLoadSchema.parse(req.body);
      const user = req.user!;

      const requestedAccountManagerId = parsed.accountManagerId ?? undefined;
      let accountManagerId = requestedAccountManagerId ?? user.sub;

      if (user.role === 'ACCOUNT_MANAGER' && !user.full_load_access) {
        accountManagerId = user.sub;
      } else if (
        user.role === 'ACCOUNT_MANAGER' &&
        user.full_load_access &&
        requestedAccountManagerId &&
        requestedAccountManagerId !== user.sub
      ) {
        accountManagerId = requestedAccountManagerId;
      }

      if (!isAdminLike(user.role) && user.role !== 'ACCOUNT_MANAGER' && accountManagerId !== user.sub) {
        throw new HttpError('Cannot create loads for another account manager.', 403, 'PERMISSION_DENIED');
      }

      let warning: string | undefined;
      const loadRefNumber = parsed.loadRefNumber?.trim();
      if (loadRefNumber) {
        const duplicate = await repository.findLatestLoadByRef(loadRefNumber);
        if (duplicate) {
          warning = `Ref # already used on Load: ${duplicate.id}`;
        }
      }

      const status = parsed.status === 'BROKERAGE' ? 'BROKERAGE' : undefined;
      validateMilesForStatus(parsed.miles, status ?? 'AVAILABLE');

      const load = await repository.createLoad({
        customerId: parsed.customerId,
        accountManagerId,
        loadRefNumber: parsed.loadRefNumber ?? undefined,
        mcleodOrderId: parsed.mcleodOrderId ?? undefined,
        puCity: parsed.puCity,
        puState: parsed.puState,
        puZip: parsed.puZip ?? undefined,
        puDate: parsed.puDate ?? undefined,
        puApptTime: parsed.puApptTime ?? undefined,
        puAppt: parsed.puAppt,
        delCity: parsed.delCity,
        delState: parsed.delState,
        delZip: parsed.delZip ?? undefined,
        delDate: parsed.delDate ?? undefined,
        delApptTime: parsed.delApptTime ?? undefined,
        delAppt: parsed.delAppt,
        rate: parsed.rate,
        miles: parsed.miles,
        notes: parsed.notes ?? undefined,
        assignedDispatcherId: parsed.assignedDispatcherId ?? undefined,
        driverName: parsed.driverName ?? undefined,
        truckNumber: parsed.truckNumber ?? undefined,
        status,
        actorName: user.name,
      });

      res.status(201).json({
        success: true,
        data: load,
        ...(warning ? { warning } : {}),
      });
    }),
  );

  router.post(
    '/loads/bulk',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = bulkRowsSchema.parse(req.body);
      const customerRows = await repository.listCustomers();
      const customersByName = new Map(customerRows.map((customer) => [customer.name.trim().toLowerCase(), customer.id]));

      const userRows = await repository.listUsers();
      const usersByName = new Map(userRows.map((user) => [user.name.trim().toLowerCase(), user.id]));

      const errors: BulkImportError[] = [];
      let importedCount = 0;

      for (const [index, row] of parsed.rows.entries()) {
        try {
          const getRowVal = (keys: string[], ...search: string[]) => {
            const key = keys.find((k) => search.some((s) => s.toLowerCase() === k.toLowerCase().trim()));
            return key ? row[key] : undefined;
          };
          const rowKeys = Object.keys(row);

          const customerName = (getRowVal(rowKeys, 'Customer') ?? '').trim();
          const customerId = customersByName.get(customerName.toLowerCase());
          if (!customerName || !customerId) {
            throw new HttpError(`Customer not found: ${customerName || '(empty)'}`, 400, 'VALIDATION_ERROR');
          }

          const puCity = (getRowVal(rowKeys, 'PU_City', 'pu_city') ?? '').trim();
          const puState = (getRowVal(rowKeys, 'PU_State', 'pu_state') ?? '').trim().toUpperCase();
          const delCity = (getRowVal(rowKeys, 'DEL_City', 'del_city') ?? '').trim();
          const delState = (getRowVal(rowKeys, 'DEL_State', 'del_state') ?? '').trim().toUpperCase();

          if (!puCity || puState.length !== 2) {
            throw new HttpError('PU_City and PU_State (2 letters) are required.', 400, 'VALIDATION_ERROR');
          }
          if (!delCity || delState.length !== 2) {
            throw new HttpError('DEL_City and DEL_State (2 letters) are required.', 400, 'VALIDATION_ERROR');
          }

          const rateRaw = getRowVal(rowKeys, 'Rate', 'rate') ?? '';
          const milesRaw = getRowVal(rowKeys, 'Miles', 'miles') ?? '';
          const rate = parseImportNumber(rateRaw);
          const miles = parseImportNumber(milesRaw);
          const rawStatus = getRowVal(rowKeys, 'Load_Status', 'load_status', 'Status', 'status') ?? '';
          const status = normalizeLoadStatusInput(rawStatus);
          if (rawStatus.trim() && !status) {
            throw new HttpError(
              `Invalid Load_Status: "${rawStatus}". Accepted values: ${LOAD_STATUSES.join(', ')}, PENDING.`,
              400,
              'VALIDATION_ERROR',
            );
          }
          const normalizedStatus = status ?? 'AVAILABLE';

          if (!Number.isFinite(rate) || rate <= 0) {
            throw new HttpError(`Rate must be a positive number. Received: "${rateRaw}"`, 400, 'VALIDATION_ERROR');
          }
          validateMilesForStatus(miles, normalizedStatus);

          const puAppt = parseBoolean(getRowVal(rowKeys, 'PU_APPT', 'pu_appt'));
          const delAppt = parseBoolean(getRowVal(rowKeys, 'DEL_APPT', 'del_appt'));
          const puApptTime = (getRowVal(rowKeys, 'PU_APPT_Time', 'pu_appt_time') ?? '').trim();
          const delApptTime = (getRowVal(rowKeys, 'DEL_APPT_Time', 'del_appt_time') ?? '').trim();

          const amName = (getRowVal(rowKeys, 'Account_Manager', 'account_manager') ?? '').trim().toLowerCase();
          const dispatcherName = (getRowVal(rowKeys, 'Dispatcher', 'dispatcher') ?? '').trim().toLowerCase();

          const accountManagerId = amName ? usersByName.get(amName) ?? req.user!.sub : req.user!.sub;
          const assignedDispatcherId = dispatcherName ? usersByName.get(dispatcherName) ?? undefined : undefined;

          await repository.createLoad({
            customerId,
            accountManagerId,
            loadRefNumber: (getRowVal(rowKeys, 'Load_Ref_Number', 'load_ref_number') ?? '').trim() || undefined,
            mcleodOrderId: (getRowVal(rowKeys, 'McLeod_ID', 'mcleod_id') ?? '').trim() || undefined,
            puCity,
            puState,
            puZip: (getRowVal(rowKeys, 'PU_ZIP', 'pu_zip') ?? '').trim() || undefined,
            puDate: (getRowVal(rowKeys, 'PU_Date', 'pu_date') ?? '').trim() || undefined,
            puAppt,
            puApptTime: puAppt ? puApptTime || undefined : undefined,
            delCity,
            delState,
            delZip: (getRowVal(rowKeys, 'DEL_ZIP', 'del_zip') ?? '').trim() || undefined,
            delDate: (getRowVal(rowKeys, 'DEL_Date', 'del_date') ?? '').trim() || undefined,
            delAppt,
            delApptTime: delAppt ? delApptTime || undefined : undefined,
            rate,
            miles,
            notes: (getRowVal(rowKeys, 'Notes', 'notes') ?? '').trim() || undefined,
            status: normalizedStatus,
            assignedDispatcherId,
            driverName: (getRowVal(rowKeys, 'Driver', 'driver', 'driver_name') ?? '').trim() || undefined,
            truckNumber: (getRowVal(rowKeys, 'Truck', 'truck', 'truck_number') ?? '').trim() || undefined,
            actorName: req.user!.name,
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

  router.delete(
    '/loads/dev/all',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (_req, res) => {
      if ((process.env.NODE_ENV ?? 'development') === 'production') {
        throw new HttpError('Delete-all loads endpoint is disabled in production.', 403, 'PERMISSION_DENIED');
      }

      const deletedCount = await repository.deleteAllLoads();
      res.json({ success: true, data: { deletedCount } });
    }),
  );

  router.delete(
    '/loads/:id',
    requireRoles(['MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      await repository.deleteLoad(req.params.id);
      res.status(204).send();
    }),
  );

  router.post(
    '/loads/:id/book',
    requireRoles(['DISPATCHER', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = bookSchema.parse(req.body);
      const load = await repository.bookLoad({
        loadId: req.params.id,
        dispatcherId: req.user!.sub,
        truckNumber: parsed.truckNumber,
        driverName: parsed.driverName,
        actorName: req.user!.name,
      });
      res.json({ success: true, data: load });
    }),
  );

  router.post(
    '/book',
    requireRoles(['DISPATCHER', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = bookSchema.parse(req.body);
      if (!parsed.loadId) {
        throw new HttpError('loadId is required.', 400, 'VALIDATION_ERROR');
      }

      const load = await repository.bookLoad({
        loadId: parsed.loadId,
        dispatcherId: req.user!.sub,
        truckNumber: parsed.truckNumber,
        driverName: parsed.driverName,
        actorName: req.user!.name,
      });
      res.json({ success: true, data: load });
    }),
  );

  router.post(
    '/loads/:id/quote',
    requireRoles(['DISPATCHER', 'MANAGER', 'ADMIN']),
    asyncHandler(async (req, res) => {
      const parsed = quoteSchema.parse(req.body);
      const pickupDate = parsed.pickupDate ?? parsed.proposedDate ?? parsed.proposed_date;
      if (!pickupDate) {
        throw new HttpError('pickupDate is required.', 400, 'VALIDATION_ERROR');
      }
      const load = await repository.quoteLoad({
        loadId: req.params.id,
        dispatcherId: req.user!.sub,
        pickupDate,
        actorName: req.user!.name,
      });
      res.status(201).json({ success: true, data: load });
    }),
  );

  router.post(
    '/loads/:id/decide',
    requireRoles(['MANAGER', 'ADMIN', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      const parsed = decideSchema.omit({ loadId: true }).parse(req.body);
      const existing = await repository.getLoadById(req.params.id);

      if (!existing) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canManageLoadByOwnership(req.user!, existing)) {
        throw new HttpError('Cannot decide this load.', 403, 'PERMISSION_DENIED');
      }

      const denyReason = parsed.denyReason ?? parsed.deny_reason ?? parsed.notes;

      const load = await repository.decideLoad({
        loadId: req.params.id,
        decision: parsed.decision,
        denyReason,
        actorName: req.user!.name,
        requestedPickupDate: parsed.requestedPickupDate,
        newDeliveryDate: parsed.newDeliveryDate,
        loadRefNumber: parsed.loadRefNumber,
        mcleodOrderId: parsed.mcleodOrderId,
      });
      res.json({ success: true, data: load });
    }),
  );

  router.post(
    '/loads/:id/decision',
    requireRoles(['MANAGER', 'ADMIN', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      const parsed = decideSchema.omit({ loadId: true }).parse(req.body);
      const existing = await repository.getLoadById(req.params.id);

      if (!existing) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canManageLoadByOwnership(req.user!, existing)) {
        throw new HttpError('Cannot decide this load.', 403, 'PERMISSION_DENIED');
      }

      const denyReason = parsed.denyReason ?? parsed.deny_reason ?? parsed.notes;

      const load = await repository.decideLoad({
        loadId: req.params.id,
        decision: parsed.decision,
        denyReason,
        actorName: req.user!.name,
        requestedPickupDate: parsed.requestedPickupDate,
        newDeliveryDate: parsed.newDeliveryDate,
        loadRefNumber: parsed.loadRefNumber,
        mcleodOrderId: parsed.mcleodOrderId,
      });
      res.json({ success: true, data: load });
    }),
  );

  router.post(
    '/decide',
    requireRoles(['MANAGER', 'ADMIN', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      const parsed = decideSchema.parse(req.body);
      if (!parsed.loadId) {
        throw new HttpError('loadId is required.', 400, 'VALIDATION_ERROR');
      }

      const existing = await repository.getLoadById(parsed.loadId);
      if (!existing) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canManageLoadByOwnership(req.user!, existing)) {
        throw new HttpError('Cannot decide this load.', 403, 'PERMISSION_DENIED');
      }

      const denyReason = parsed.denyReason ?? parsed.deny_reason ?? parsed.notes;

      const load = await repository.decideLoad({
        loadId: parsed.loadId,
        decision: parsed.decision,
        denyReason,
        actorName: req.user!.name,
        requestedPickupDate: parsed.requestedPickupDate,
        newDeliveryDate: parsed.newDeliveryDate,
        loadRefNumber: parsed.loadRefNumber,
        mcleodOrderId: parsed.mcleodOrderId,
      });
      res.json({ success: true, data: load });
    }),
  );

  router.patch(
    '/loads/:id/status',
    requireRoles(['DISPATCHER', 'MANAGER', 'ADMIN', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      const parsed = statusSchema.parse(req.body);
      const existing = await repository.getLoadById(req.params.id);

      if (!existing) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canManageLoadByOwnership(req.user!, existing)) {
        throw new HttpError('Cannot update status for this load.', 403, 'PERMISSION_DENIED');
      }

      if (req.user!.role === 'DISPATCHER') {
        const allowed: LoadStatus[] = ['LOADED', 'DELIVERED', 'DELAYED', 'CANCELED', 'TONU'];
        if (!allowed.includes(parsed.status)) {
          throw new HttpError(
            'Dispatchers can only set LOADED, DELIVERED, DELAYED, CANCELED, or TONU.',
            403,
            'PERMISSION_DENIED',
          );
        }
      }

      const load = await repository.updateLoadStatus(req.params.id, parsed.status, req.user!.name, parsed.reason);
      res.json({ success: true, data: load });
    }),
  );

  router.patch(
    '/loads/:id',
    requireRoles(['ACCOUNT_MANAGER', 'MANAGER', 'ADMIN', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      const parsed = updateLoadSchema.parse(req.body);
      const existing = await repository.getLoadById(req.params.id);

      if (!existing) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canManageLoadByOwnership(req.user!, existing)) {
        throw new HttpError('Cannot edit this load.', 403, 'PERMISSION_DENIED');
      }

      if (req.user!.role === 'DISPATCHER') {
        const keys = Object.keys(parsed).filter((key) => (parsed as Record<string, unknown>)[key] !== undefined);
        const allowedKeys = new Set(['driverName', 'truckNumber']);
        const disallowed = keys.find((key) => !allowedKeys.has(key));
        if (disallowed) {
          throw new HttpError(
            'Dispatchers can only edit driver and truck fields on their own loads.',
            403,
            'PERMISSION_DENIED',
          );
        }
      }

      if (
        req.user!.role === 'ACCOUNT_MANAGER' &&
        !req.user!.full_load_access &&
        parsed.accountManagerId &&
        parsed.accountManagerId !== req.user!.sub
      ) {
        throw new HttpError('Cannot reassign load to another account manager.', 403, 'PERMISSION_DENIED');
      }

      if (parsed.miles !== undefined || parsed.status !== undefined) {
        const nextStatus = parsed.status ?? existing.status;
        const nextMiles = parsed.miles ?? Number(existing.miles);
        validateMilesForStatus(nextMiles, nextStatus);
      }

      const load = await repository.updateLoad(req.params.id, {
        ...parsed,
        actorName: req.user!.name,
      });
      res.json({ success: true, data: load });
    }),
  );

  return router;
}
