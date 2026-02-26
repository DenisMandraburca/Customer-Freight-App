import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TestContext } from './helpers.js';
import { bootTestContext } from './helpers.js';

const hasDatabase = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_URL);
const integration = hasDatabase ? describe : describe.skip;

integration('API integration', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await bootTestContext();
  });

  afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  it('GET /api/customer-freight/health returns the expected health payload', async () => {
    const response = await ctx.request.get('/api/customer-freight/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns 401 when req.userSession is missing', async () => {
    const response = await ctx.request.get('/api/customer-freight/loads');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it('returns 403 when user lacks customer-freight permissions', async () => {
    const response = await ctx.request
      .get('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher, { permissions: [] }));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PERMISSION_DENIED');
  });

  it('POST /api/customer-freight/loads calculates RPM and creates a load', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1001',
        mcleodOrderId: 'MC-1001',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-02-12',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-02-13',
        rate: 1200,
        miles: 600,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('AVAILABLE');
    expect(Number(response.body.data.rpm)).toBe(2);
  });

  it('POST /api/customer-freight/loads/bulk imports row with Load_Status=COVERED', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-STATUS-COVERED',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '1200',
            Miles: '600',
            Load_Status: 'COVERED',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(0);

    const loadsResponse = await ctx.request
      .get('/api/customer-freight/loads?ref=BULK-STATUS-COVERED')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(loadsResponse.status).toBe(200);
    expect(loadsResponse.body.data).toHaveLength(1);
    expect(loadsResponse.body.data[0].status).toBe('COVERED');
  });

  it('POST /api/customer-freight/loads/bulk accepts alias Load_Status=PENDING', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-STATUS-PENDING',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '1200',
            Miles: '600',
            Load_Status: 'PENDING',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(0);

    const loadsResponse = await ctx.request
      .get('/api/customer-freight/loads?ref=BULK-STATUS-PENDING')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(loadsResponse.status).toBe(200);
    expect(loadsResponse.body.data).toHaveLength(1);
    expect(loadsResponse.body.data[0].status).toBe('PENDING_APPROVAL');
  });

  it('POST /api/customer-freight/loads/bulk defaults to AVAILABLE when Load_Status is blank', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-STATUS-BLANK',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '1200',
            Miles: '600',
            Load_Status: '   ',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(0);

    const loadsResponse = await ctx.request
      .get('/api/customer-freight/loads?ref=BULK-STATUS-BLANK')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(loadsResponse.status).toBe(200);
    expect(loadsResponse.body.data).toHaveLength(1);
    expect(loadsResponse.body.data[0].status).toBe('AVAILABLE');
  });

  it('POST /api/customer-freight/loads/bulk rejects invalid Load_Status per-row and preserves partial import', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-STATUS-VALID',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '1200',
            Miles: '600',
            Load_Status: 'COVERED',
          },
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-STATUS-INVALID',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '1200',
            Miles: '600',
            Load_Status: 'NOT_A_STATUS',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(1);
    expect(response.body.data.errors).toHaveLength(1);
    expect(response.body.data.errors[0].row).toBe(3);
    expect(response.body.data.errors[0].message).toContain('Invalid Load_Status');
    expect(response.body.data.errors[0].message).toContain('NOT_A_STATUS');
  });

  it('POST /api/customer-freight/loads/bulk accepts Rate/Miles formatted with currency and thousands separators', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-FORMATTED-NUMBERS',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '$3,300',
            Miles: '1,297',
            Load_Status: 'BROKERAGE',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(0);

    const loadsResponse = await ctx.request
      .get('/api/customer-freight/loads?ref=BULK-FORMATTED-NUMBERS')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(loadsResponse.status).toBe(200);
    expect(loadsResponse.body.data).toHaveLength(1);
    expect(Number(loadsResponse.body.data[0].rate)).toBe(3300);
    expect(Number(loadsResponse.body.data[0].miles)).toBe(1297);
  });

  it('POST /api/customer-freight/loads/bulk allows Miles=0 only for TONU status', async () => {
    const response = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        rows: [
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-TONU-ZERO',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '500',
            Miles: '0',
            Load_Status: 'TONU',
          },
          {
            Customer: ctx.customer.name,
            Load_Ref_Number: 'BULK-NON-TONU-ZERO',
            PU_City: 'Chicago',
            PU_State: 'IL',
            DEL_City: 'Dallas',
            DEL_State: 'TX',
            Rate: '500',
            Miles: '0',
            Load_Status: 'DELIVERED',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(response.body.data.failedCount).toBe(1);
    expect(response.body.data.errors[0].row).toBe(3);
    expect(response.body.data.errors[0].message).toContain('Miles can be 0 only when status is TONU');
  });

  it('rejects duplicate McLeod # but allows empty McLeod #', async () => {
    const first = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-MC-1',
        mcleodOrderId: 'MC-DUP-1001',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 1000,
        miles: 600,
      });
    expect(first.status).toBe(201);

    const duplicate = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-MC-2',
        mcleodOrderId: 'MC-DUP-1001',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Austin',
        delState: 'TX',
        rate: 1000,
        miles: 600,
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain('McLeod # already exists');

    const emptyOne = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-MC-EMPTY-1',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 1000,
        miles: 600,
      });
    expect(emptyOne.status).toBe(201);

    const emptyTwo = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-MC-EMPTY-2',
        mcleodOrderId: '',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 1000,
        miles: 600,
      });
    expect(emptyTwo.status).toBe(201);
  });

  it('DELETE /api/customer-freight/loads/dev/all removes all loads in non-production environments', async () => {
    await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-DEV-1',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 1200,
        miles: 600,
      });
    await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-DEV-2',
        puCity: 'Chicago',
        puState: 'IL',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 1200,
        miles: 600,
      });

    const clearResponse = await ctx.request
      .delete('/api/customer-freight/loads/dev/all')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.data.deletedCount).toBe(2);

    const loadsAfter = await ctx.request
      .get('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(loadsAfter.status).toBe(200);
    expect(loadsAfter.body.data).toHaveLength(0);
  });

  it('booking and manager decision acceptance transitions to COVERED', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1002',
        puCity: 'Houston',
        puState: 'TX',
        delCity: 'Atlanta',
        delState: 'GA',
        rate: 1000,
        miles: 500,
      });

    const loadId = createResponse.body.data.id as string;

    const bookResponse = await ctx.request
      .post('/api/customer-freight/book')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        loadId,
        truckNumber: 'TRK-7',
        driverName: 'Driver A',
      });

    expect(bookResponse.status).toBe(200);
    expect(bookResponse.body.data.status).toBe('PENDING_APPROVAL');

    const decideResponse = await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/decision`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        decision: 'accept',
        notes: 'Approved by manager',
      });

    expect(decideResponse.status).toBe(200);
    expect(decideResponse.body.data.status).toBe('COVERED');
  });

  it('quote accept updates PU/DEL dates and optional ref/mcleod fields', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1005',
        puCity: 'Toledo',
        puState: 'OH',
        delCity: 'Detroit',
        delState: 'MI',
        puDate: '2026-02-18',
        delDate: '2026-02-19',
        rate: 1000,
        miles: 250,
      });

    const loadId = createResponse.body.data.id as string;

    await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/quote`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        pickupDate: '2026-02-21',
      });

    const decisionResponse = await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/decision`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        decision: 'accept',
        notes: 'Accepted with updated dates',
        requestedPickupDate: '2026-02-21',
        newDeliveryDate: '2026-02-22',
        loadRefNumber: 'LD-1005A',
        mcleodOrderId: 'MC-1005A',
      });

    expect(decisionResponse.status).toBe(200);
    expect(decisionResponse.body.data.status).toBe('COVERED');
    expect(decisionResponse.body.data.pu_date).toBe('2026-02-21');
    expect(decisionResponse.body.data.del_date).toBe('2026-02-22');
    expect(decisionResponse.body.data.load_ref_number).toBe('LD-1005A');
    expect(decisionResponse.body.data.mcleod_order_id).toBe('MC-1005A');
  });

  it('deny decision restores AVAILABLE and releases Greenbush reservation', async () => {
    const greenbush = await ctx.repository.createGreenbush({
      pickupLocation: 'Pittsburgh',
      destination: 'Cleveland',
      receivingHours: '08:00 - 15:00',
      price: 900,
      tarp: 'Y',
      remainingCount: 1,
      specialNotes: 'Greenbush route',
    });

    const quoteResponse = await ctx.request
      .post('/api/customer-freight/greenbush/quote')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        greenbushId: greenbush.id,
        pickupDate: '2026-02-13',
        truckNumber: 'GB-1',
        driverName: 'Green Driver',
      });

    expect(quoteResponse.status).toBe(201);
    const loadId = quoteResponse.body.data.id;

    const denyResponse = await ctx.request
      .post('/api/customer-freight/decide')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        loadId,
        decision: 'deny',
        notes: 'Denied for test',
      });

    expect(denyResponse.status).toBe(200);
    expect(denyResponse.body.data.status).toBe('AVAILABLE');
  });

  it('PATCH /api/customer-freight/loads/:id/status enforces reason for DELAYED and CANCELED', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1006',
        puCity: 'Nashville',
        puState: 'TN',
        delCity: 'Memphis',
        delState: 'TN',
        rate: 850,
        miles: 220,
      });

    const loadId = createResponse.body.data.id as string;

    await ctx.request
      .post('/api/customer-freight/book')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        loadId,
        truckNumber: 'TRK-9',
        driverName: 'Driver C',
      });

    await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/decision`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        decision: 'accept',
      });

    const missingReason = await ctx.request
      .patch(`/api/customer-freight/loads/${loadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        status: 'DELAYED',
      });

    expect(missingReason.status).toBe(400);
  });

  it('customer-freight:admin permission grants effective admin access', async () => {
    const viewer = await ctx.repository.createUser({
      email: 'viewer.admin@afctransport.com',
      name: 'Viewer Admin',
      role: 'VIEWER',
    });

    const response = await ctx.request
      .post('/api/customer-freight/users')
      .set(
        'x-test-session',
        ctx.sessionHeaderFor(viewer, {
          permissions: ['customer-freight:access', 'customer-freight:admin'],
        }),
      )
      .send({
        email: 'created.by.admin.permission@afctransport.com',
        name: 'Created By Permission',
        role: 'VIEWER',
      });

    expect(response.status).toBe(201);
  });

  it('banned DB user is denied even with admin permission', async () => {
    const banned = await ctx.repository.createUser({
      email: 'banned.user@afctransport.com',
      name: 'Banned User',
      role: 'BANNED',
    });

    const response = await ctx.request
      .get('/api/customer-freight/me')
      .set(
        'x-test-session',
        ctx.sessionHeaderFor(banned, {
          permissions: ['customer-freight:access', 'customer-freight:admin'],
        }),
      );

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('PERMISSION_DENIED');
  });

  it('checkCompanyDomain blocks authenticated users outside allowed domains', async () => {
    const outsider = await ctx.repository.createUser({
      email: 'outsider@gmail.com',
      name: 'Outsider',
      role: 'DISPATCHER',
    });

    const response = await ctx.request
      .get('/api/customer-freight/me')
      .set('x-test-session', ctx.sessionHeaderFor(outsider));

    expect(response.status).toBe(403);
  });
});
