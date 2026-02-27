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

  it('account manager can book and quote available loads', async () => {
    const bookLoadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'AM-BOOK-1',
        puCity: 'El Paso',
        puState: 'TX',
        delCity: 'Albuquerque',
        delState: 'NM',
        rate: 900,
        miles: 250,
      });
    expect(bookLoadResponse.status).toBe(201);

    const bookResponse = await ctx.request
      .post('/api/customer-freight/book')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        loadId: bookLoadResponse.body.data.id,
        truckNumber: 'AM-TRK-1',
        driverName: 'Account Manager Booker',
      });
    expect(bookResponse.status).toBe(200);
    expect(bookResponse.body.data.status).toBe('PENDING_APPROVAL');

    const quoteLoadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'AM-QUOTE-1',
        puCity: 'Buffalo',
        puState: 'NY',
        delCity: 'Rochester',
        delState: 'NY',
        rate: 500,
        miles: 80,
      });
    expect(quoteLoadResponse.status).toBe(201);

    const quoteResponse = await ctx.request
      .post(`/api/customer-freight/loads/${quoteLoadResponse.body.data.id}/quote`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        pickupDate: '2026-03-02',
      });
    expect(quoteResponse.status).toBe(201);
    expect(quoteResponse.body.data.status).toBe('QUOTE_SUBMITTED');
  });

  it('account manager can delete loads', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'AM-DELETE-LOAD-1',
        puCity: 'Boise',
        puState: 'ID',
        delCity: 'Salt Lake City',
        delState: 'UT',
        rate: 750,
        miles: 320,
      });
    expect(createResponse.status).toBe(201);

    const deleteResponse = await ctx.request
      .delete(`/api/customer-freight/loads/${createResponse.body.data.id}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(deleteResponse.status).toBe(204);

    const verifyResponse = await ctx.request
      .get('/api/customer-freight/loads?ref=AM-DELETE-LOAD-1')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data).toHaveLength(0);
  });

  it('account manager can mutate greenbush routes', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/greenbush')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        pickupLocation: 'Harrisburg',
        destination: 'Philadelphia',
        receivingHours: '06:00 - 15:00',
        price: 1200,
        tarp: 'No',
        remainingCount: 3,
        specialNotes: 'AM route',
      });
    expect(createResponse.status).toBe(201);
    const rowId = createResponse.body.data.id as string;

    const updateResponse = await ctx.request
      .patch(`/api/customer-freight/greenbush/${rowId}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        pickupLocation: 'Harrisburg',
        destination: 'Philadelphia',
        receivingHours: '06:00 - 16:00',
        price: 1250,
        tarp: 'Yes',
        remainingCount: 4,
        specialNotes: 'AM route updated',
      });
    expect(updateResponse.status).toBe(200);

    const incrementResponse = await ctx.request
      .post(`/api/customer-freight/greenbush/${rowId}/increment`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(incrementResponse.status).toBe(200);

    const deleteResponse = await ctx.request
      .delete(`/api/customer-freight/greenbush/${rowId}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(deleteResponse.status).toBe(204);

    const bulkReplaceResponse = await ctx.request
      .post('/api/customer-freight/greenbush/bulk-replace')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        rows: [
          {
            pickupLocation: 'York',
            destination: 'Lancaster',
            receivingHours: '07:00 - 14:00',
            price: 980,
            tarp: 'No',
            remainingCount: 2,
            specialNotes: 'Bulk row',
          },
        ],
      });
    expect(bulkReplaceResponse.status).toBe(200);
    expect(bulkReplaceResponse.body.data).toHaveLength(1);
  });

  it('account manager can delete customers', async () => {
    const customer = await ctx.repository.createCustomer({
      name: 'Delete Me Customer',
      type: 'Broker',
      quoteAccept: false,
    });

    const deleteResponse = await ctx.request
      .delete(`/api/customer-freight/customers/${customer.id}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(deleteResponse.status).toBe(204);

    const customersResponse = await ctx.request
      .get('/api/customer-freight/customers')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(customersResponse.status).toBe(200);
    expect(customersResponse.body.data.some((row: { id: string }) => row.id === customer.id)).toBe(false);
  });

  it('account manager receives users and customers in initial-data payload', async () => {
    const response = await ctx.request
      .get('/api/customer-freight/initial-data')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.users)).toBe(true);
    expect(response.body.data.users.length).toBeGreaterThan(0);
    expect(response.body.data.users.some((row: { id: string }) => row.id === ctx.users.dispatcher.id)).toBe(true);
    expect(Array.isArray(response.body.data.customers)).toBe(true);
    expect(response.body.data.customers.some((row: { id: string }) => row.id === ctx.customer.id)).toBe(true);
  });

  it('account manager is denied settings-only endpoints', async () => {
    const usersResponse = await ctx.request
      .get('/api/customer-freight/users')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(usersResponse.status).toBe(403);

    const bulkLoadsResponse = await ctx.request
      .post('/api/customer-freight/loads/bulk')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({ rows: [] });
    expect(bulkLoadsResponse.status).toBe(403);

    const deleteAllResponse = await ctx.request
      .delete('/api/customer-freight/loads/dev/all')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(deleteAllResponse.status).toBe(403);
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

  it('chat: creates system message when a load is denied with reason', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'CHAT-DENY-1',
        puCity: 'Miami',
        puState: 'FL',
        delCity: 'Tampa',
        delState: 'FL',
        rate: 900,
        miles: 280,
      });

    const loadId = createResponse.body.data.id as string;

    await ctx.request
      .post('/api/customer-freight/book')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        loadId,
        truckNumber: 'CHAT-TRK-1',
        driverName: 'Chat Driver',
      });

    const denyResponse = await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/decision`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        decision: 'deny',
        denyReason: 'Rate not approved',
      });

    expect(denyResponse.status).toBe(200);
    expect(denyResponse.body.data.status).toBe('AVAILABLE');

    const messagesResponse = await ctx.request
      .get(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.data).toHaveLength(1);
    expect(messagesResponse.body.data[0].message_type).toBe('SYSTEM');
    expect(messagesResponse.body.data[0].system_event).toBe('DENIED');
    expect(messagesResponse.body.data[0].message_text).toContain('Rate not approved');
  });

  it('chat: creates system message for DELAYED/CANCELED/TONU status updates', async () => {
    const createResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'CHAT-DELAY-1',
        puCity: 'Kansas City',
        puState: 'MO',
        delCity: 'Omaha',
        delState: 'NE',
        rate: 780,
        miles: 240,
      });

    const loadId = createResponse.body.data.id as string;

    await ctx.request
      .post('/api/customer-freight/book')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        loadId,
        truckNumber: 'CHAT-TRK-2',
        driverName: 'Delay Driver',
      });

    await ctx.request
      .post(`/api/customer-freight/loads/${loadId}/decision`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        decision: 'accept',
      });

    const delayedResponse = await ctx.request
      .patch(`/api/customer-freight/loads/${loadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        status: 'DELAYED',
        reason: 'Dock congestion',
      });

    expect(delayedResponse.status).toBe(200);
    expect(delayedResponse.body.data.status).toBe('DELAYED');

    const messagesResponse = await ctx.request
      .get(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.data).toHaveLength(1);
    expect(messagesResponse.body.data[0].message_type).toBe('SYSTEM');
    expect(messagesResponse.body.data[0].system_event).toBe('DELAYED');
    expect(messagesResponse.body.data[0].message_text).toContain('Dock congestion');
  });

  it('chat: hides Delivered/Brokerage loads and does not create chat for never-transitioned AVAILABLE loads', async () => {
    const availableLoad = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'CHAT-HIDE-AVAILABLE',
        puCity: 'Austin',
        puState: 'TX',
        delCity: 'Dallas',
        delState: 'TX',
        rate: 700,
        miles: 200,
      });

    const coveredLoad = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-HIDE-COVERED',
        puCity: 'Reno',
        puState: 'NV',
        delCity: 'Sacramento',
        delState: 'CA',
        rate: 800,
        miles: 150,
      });

    const brokerageLoad = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'CHAT-HIDE-BROKERAGE',
        puCity: 'Boise',
        puState: 'ID',
        delCity: 'Salt Lake City',
        delState: 'UT',
        rate: 850,
        miles: 300,
        status: 'BROKERAGE',
      });

    const coveredLoadId = coveredLoad.body.data.id as string;

    const toDelivered = await ctx.request
      .patch(`/api/customer-freight/loads/${coveredLoadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        status: 'DELIVERED',
      });

    expect(toDelivered.status).toBe(200);

    const chatLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));

    expect(chatLoads.status).toBe(200);
    const refs = chatLoads.body.data.map((row: { load_ref_number: string }) => row.load_ref_number);
    expect(refs).not.toContain(availableLoad.body.data.load_ref_number);
    expect(refs).not.toContain(coveredLoad.body.data.load_ref_number);
    expect(refs).not.toContain(brokerageLoad.body.data.load_ref_number);
  });

  it('chat: delivered threads are hidden by default, shown with includeDelivered, and can be pinned via protection', async () => {
    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-DELIVERED-TOGGLE',
        puCity: 'Fargo',
        puState: 'ND',
        delCity: 'Sioux Falls',
        delState: 'SD',
        rate: 880,
        miles: 230,
        status: 'COVERED',
      });

    const loadId = loadResponse.body.data.id as string;

    const messageResponse = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Delivered visibility test',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(messageResponse.status).toBe(201);

    const deliveredResponse = await ctx.request
      .patch(`/api/customer-freight/loads/${loadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        status: 'DELIVERED',
      });
    expect(deliveredResponse.status).toBe(200);

    const hiddenByDefault = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(hiddenByDefault.status).toBe(200);
    expect(hiddenByDefault.body.data.some((row: { id: string }) => row.id === loadId)).toBe(false);

    const shownWhenIncluded = await ctx.request
      .get('/api/customer-freight/chat/loads?includeDelivered=1')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(shownWhenIncluded.status).toBe(200);
    expect(shownWhenIncluded.body.data.some((row: { id: string }) => row.id === loadId)).toBe(true);

    const protectResponse = await ctx.request
      .patch(`/api/customer-freight/chat/loads/${loadId}/protection`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        protectFromPurge: true,
      });
    expect(protectResponse.status).toBe(200);
    expect(protectResponse.body.data.protectFromPurge).toBe(true);

    const shownWhenProtected = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(shownWhenProtected.status).toBe(200);
    const protectedRow = shownWhenProtected.body.data.find((row: { id: string }) => row.id === loadId);
    expect(protectedRow).toBeTruthy();
    expect(protectedRow.is_protected).toBe(true);

    const unprotectResponse = await ctx.request
      .patch(`/api/customer-freight/chat/loads/${loadId}/protection`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        protectFromPurge: false,
      });
    expect(unprotectResponse.status).toBe(200);

    const hiddenAgain = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(hiddenAgain.status).toBe(200);
    expect(hiddenAgain.body.data.some((row: { id: string }) => row.id === loadId)).toBe(false);
  });

  it('chat: role-scoped chat loads visibility works for admin, AM, another AM, and dispatcher', async () => {
    const anotherAccountManager = await ctx.repository.createUser({
      email: 'sales.other@afctransport.com',
      name: 'Account Manager Other',
      role: 'ACCOUNT_MANAGER',
    });

    const dispatcherTwo = await ctx.repository.createUser({
      email: 'dispatch.two@afclogistics.com',
      name: 'Dispatcher Two',
      role: 'DISPATCHER',
    });

    const loadOneResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-SCOPE-1',
        puCity: 'Denver',
        puState: 'CO',
        delCity: 'Boulder',
        delState: 'CO',
        rate: 600,
        miles: 120,
      });

    const loadTwoResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: anotherAccountManager.id,
        assignedDispatcherId: dispatcherTwo.id,
        loadRefNumber: 'CHAT-SCOPE-2',
        puCity: 'Phoenix',
        puState: 'AZ',
        delCity: 'Tucson',
        delState: 'AZ',
        rate: 700,
        miles: 110,
      });

    expect(loadOneResponse.status).toBe(201);
    expect(loadTwoResponse.status).toBe(201);

    const adminLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(adminLoads.status).toBe(200);
    expect(adminLoads.body.data).toHaveLength(2);

    const accountManagerLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(accountManagerLoads.status).toBe(200);
    expect(accountManagerLoads.body.data).toHaveLength(2);

    const anotherAccountManagerLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(anotherAccountManager));
    expect(anotherAccountManagerLoads.status).toBe(200);
    expect(anotherAccountManagerLoads.body.data).toHaveLength(2);

    const dispatcherLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher));
    expect(dispatcherLoads.status).toBe(200);
    expect(dispatcherLoads.body.data).toHaveLength(1);
    expect(dispatcherLoads.body.data[0].load_ref_number).toBe('CHAT-SCOPE-1');
  });

  it('chat: dispatcher sees own + addressed messages and cannot see account-manager-only messages from others', async () => {
    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-FILTER-1',
        puCity: 'Raleigh',
        puState: 'NC',
        delCity: 'Charlotte',
        delState: 'NC',
        rate: 650,
        miles: 150,
      });

    const loadId = loadResponse.body.data.id as string;

    const managerToAm = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Manager to AM only',
        targetScope: 'ACCOUNT_MANAGER',
      });
    expect(managerToAm.status).toBe(201);

    const managerBroadcast = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Manager broadcast',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(managerBroadcast.status).toBe(201);

    const dispatcherOwn = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({
        messageText: 'Dispatcher own message',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(dispatcherOwn.status).toBe(201);

    const managerToDispatcher = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Manager to dispatcher',
        targetScope: 'DISPATCHER',
      });
    expect(managerToDispatcher.status).toBe(201);

    const dispatcherView = await ctx.request
      .get(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher));

    expect(dispatcherView.status).toBe(200);
    const visibleTexts = dispatcherView.body.data.map((row: { message_text: string }) => row.message_text);
    expect(visibleTexts).toContain('Manager broadcast');
    expect(visibleTexts).toContain('Dispatcher own message');
    expect(visibleTexts).toContain('Manager to dispatcher');
    expect(visibleTexts).not.toContain('Manager to AM only');
  });

  it('chat: message creation validates target assignment', async () => {
    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'CHAT-VALIDATE-1',
        puCity: 'Columbus',
        puState: 'OH',
        delCity: 'Dayton',
        delState: 'OH',
        rate: 500,
        miles: 80,
        status: 'COVERED',
      });

    const loadId = loadResponse.body.data.id as string;

    const response = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Ping dispatcher',
        targetScope: 'DISPATCHER',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });

  it('chat: admin can delete a message and clear an entire order thread', async () => {
    const firstLoadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-CLEAR-A',
        mcleodOrderId: 'MC-THREAD-1',
        puCity: 'Seattle',
        puState: 'WA',
        delCity: 'Tacoma',
        delState: 'WA',
        rate: 1000,
        miles: 100,
      });

    const secondLoadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-CLEAR-B',
        mcleodOrderId: 'MC-THREAD-1',
        puCity: 'Spokane',
        puState: 'WA',
        delCity: 'Yakima',
        delState: 'WA',
        rate: 900,
        miles: 130,
      });

    const firstLoadId = firstLoadResponse.body.data.id as string;
    const secondLoadId = secondLoadResponse.body.data.id as string;

    const firstMessage = await ctx.request
      .post(`/api/customer-freight/chat/loads/${firstLoadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Message one',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(firstMessage.status).toBe(201);

    const secondMessage = await ctx.request
      .post(`/api/customer-freight/chat/loads/${secondLoadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Message two',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(secondMessage.status).toBe(201);

    const deleteResponse = await ctx.request
      .delete(`/api/customer-freight/chat/messages/${firstMessage.body.data.id}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(deleteResponse.status).toBe(204);

    const afterDelete = await ctx.request
      .get(`/api/customer-freight/chat/loads/${firstLoadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(afterDelete.status).toBe(200);
    expect(afterDelete.body.data).toHaveLength(0);

    const chatLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    const loadThread = chatLoads.body.data.find((row: { id: string; order_key: string }) => row.id === secondLoadId);
    expect(loadThread).toBeTruthy();

    const clearResponse = await ctx.request
      .post('/api/customer-freight/chat/orders/clear')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ orderKey: loadThread.order_key });

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.data.deletedCount).toBe(1);

    const afterClear = await ctx.request
      .get(`/api/customer-freight/chat/loads/${secondLoadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(afterClear.status).toBe(200);
    expect(afterClear.body.data).toHaveLength(0);
  });

  it('chat: dispatcher cannot moderate threads while account manager can', async () => {
    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        assignedDispatcherId: ctx.users.dispatcher.id,
        loadRefNumber: 'CHAT-PERM-1',
        puCity: 'Portland',
        puState: 'OR',
        delCity: 'Eugene',
        delState: 'OR',
        rate: 700,
        miles: 90,
      });

    const loadId = loadResponse.body.data.id as string;

    const firstMessageResponse = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Permission test',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(firstMessageResponse.status).toBe(201);

    const chatLoads = await ctx.request
      .get('/api/customer-freight/chat/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    const orderKey = chatLoads.body.data[0]?.order_key as string;

    const deleteByAccountManager = await ctx.request
      .delete(`/api/customer-freight/chat/messages/${firstMessageResponse.body.data.id}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager));
    expect(deleteByAccountManager.status).toBe(204);

    const secondMessageResponse = await ctx.request
      .post(`/api/customer-freight/chat/loads/${loadId}/messages`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        messageText: 'Permission test 2',
        targetScope: 'ORDER_PARTICIPANTS',
      });
    expect(secondMessageResponse.status).toBe(201);

    const deleteDenied = await ctx.request
      .delete(`/api/customer-freight/chat/messages/${secondMessageResponse.body.data.id}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher));
    expect(deleteDenied.status).toBe(403);

    const clearByAccountManager = await ctx.request
      .post('/api/customer-freight/chat/orders/clear')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.accountManager))
      .send({ orderKey });
    expect(clearByAccountManager.status).toBe(200);

    const clearDenied = await ctx.request
      .post('/api/customer-freight/chat/orders/clear')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.dispatcher))
      .send({ orderKey });
    expect(clearDenied.status).toBe(403);
  });

  it('settlements: generates with exclusions, tier, and category compensation', async () => {
    const brokerCustomer = await ctx.repository.createCustomer({
      name: 'Broker Ops',
      type: 'Broker',
      quoteAccept: false,
    });
    const directExceptionCustomer = await ctx.repository.createCustomer({
      name: 'Direct Exception LLC',
      type: 'Direct Customer',
      quoteAccept: false,
    });

    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 1000 });

    await ctx.request
      .put('/api/customer-freight/settlements/config/direct-exceptions')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ customerIds: [directExceptionCustomer.id] });

    const createLoad = async (
      customerId: string,
      ref: string,
      puDate: string,
      delDate: string,
      rate: number,
      miles: number,
    ): Promise<string> => {
      const response = await ctx.request
        .post('/api/customer-freight/loads')
        .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
        .send({
          customerId,
          accountManagerId: ctx.users.accountManager.id,
          loadRefNumber: ref,
          puCity: 'Chicago',
          puState: 'IL',
          puDate,
          delCity: 'Dallas',
          delState: 'TX',
          delDate,
          rate,
          miles,
        });
      expect(response.status).toBe(201);
      return response.body.data.id as string;
    };

    await createLoad(brokerCustomer.id, 'SETTLE-BROKER-1', '2026-01-10', '2026-01-12', 1500, 700);
    await createLoad(directExceptionCustomer.id, 'SETTLE-EXC-1', '2026-01-11', '2026-01-13', 1200, 500);
    await createLoad(ctx.customer.id, 'SETTLE-STD-1', '2026-01-12', '2026-01-14', 1100, 400);

    const tonuLoadId = await createLoad(ctx.customer.id, 'SETTLE-TONU-LOW', '2026-01-13', '2026-01-15', 100, 50);
    const cancelLoadId = await createLoad(ctx.customer.id, 'SETTLE-CANCEL-1', '2026-01-14', '2026-01-16', 900, 300);

    const tonuStatusResponse = await ctx.request
      .patch(`/api/customer-freight/loads/${tonuLoadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ status: 'TONU', reason: 'No truck available' });
    expect(tonuStatusResponse.status).toBe(200);

    const cancelStatusResponse = await ctx.request
      .patch(`/api/customer-freight/loads/${cancelLoadId}/status`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ status: 'CANCELED', reason: 'Canceled by customer' });
    expect(cancelStatusResponse.status).toBe(200);

    const generateResponse = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 1,
        year: 2026,
        calculationMethod: 'PU',
      });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.data.summary.defaultFlatPay).toBe(1000);
    expect(generateResponse.body.data.summary.brokerLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.directExceptionLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.directStandardLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.tierBasisLoadCount).toBe(3);
    expect(generateResponse.body.data.summary.totalLoadCompensation).toBe(20);
    expect(generateResponse.body.data.summary.totalSettlementAmount).toBe(1020);
    expect(generateResponse.body.data.excludedTonuLoads).toHaveLength(1);
    expect(generateResponse.body.data.excludedTonuLoads[0].loadRefNumber).toBe('SETTLE-TONU-LOW');
  });

  it('settlements: tier basis uses all payable loads and applies tier only to standard direct loads', async () => {
    const brokerCustomer = await ctx.repository.createCustomer({
      name: 'Basis Broker',
      type: 'Broker',
      quoteAccept: false,
    });
    const directExceptionCustomer = await ctx.repository.createCustomer({
      name: 'Basis Direct Exception',
      type: 'Direct Customer',
      quoteAccept: false,
    });

    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 1000 });

    await ctx.request
      .patch('/api/customer-freight/settlements/config/tier')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        brokerLoadPay: 5,
        tier1MaxLoad: 1,
        tier1Rate: 10,
        tier2MaxLoad: 2,
        tier2Rate: 10.5,
        tier3Rate: 11,
      });

    await ctx.request
      .put('/api/customer-freight/settlements/config/direct-exceptions')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ customerIds: [directExceptionCustomer.id] });

    const createLoad = async (
      customerId: string,
      ref: string,
      puDate: string,
      delDate: string,
      rate: number,
      miles: number,
    ): Promise<string> => {
      const response = await ctx.request
        .post('/api/customer-freight/loads')
        .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
        .send({
          customerId,
          accountManagerId: ctx.users.accountManager.id,
          loadRefNumber: ref,
          puCity: 'Chicago',
          puState: 'IL',
          puDate,
          delCity: 'Dallas',
          delState: 'TX',
          delDate,
          rate,
          miles,
        });
      expect(response.status).toBe(201);
      return response.body.data.id as string;
    };

    await createLoad(brokerCustomer.id, 'SETTLE-BASIS-BROKER-1', '2026-08-10', '2026-08-12', 1500, 700);
    await createLoad(directExceptionCustomer.id, 'SETTLE-BASIS-EXC-1', '2026-08-11', '2026-08-13', 1200, 500);
    await createLoad(ctx.customer.id, 'SETTLE-BASIS-STD-1', '2026-08-12', '2026-08-14', 1100, 400);

    const generateResponse = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 8,
        year: 2026,
        calculationMethod: 'PU',
      });

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body.data.summary.brokerLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.directExceptionLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.directStandardLoadCount).toBe(1);
    expect(generateResponse.body.data.summary.tierBasisLoadCount).toBe(3);
    expect(generateResponse.body.data.summary.tierApplied).toBe(3);
    expect(generateResponse.body.data.summary.tierRate).toBe(11);
    expect(generateResponse.body.data.summary.totalLoadCompensation).toBe(21);
    expect(generateResponse.body.data.summary.totalSettlementAmount).toBe(1021);
    expect(generateResponse.body.data.brokerLoads[0].compensationAmount).toBe(5);
    expect(generateResponse.body.data.directExceptionLoads[0].compensationAmount).toBe(5);
    expect(generateResponse.body.data.directStandardLoads[0].compensationAmount).toBe(11);
  });

  it('settlements: duplicate generation blocks unless override=true', async () => {
    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 500 });

    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        loadRefNumber: 'SETTLE-DUP-1',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-03-10',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-03-12',
        rate: 1000,
        miles: 500,
      });
    expect(loadResponse.status).toBe(201);

    const firstGenerate = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 3,
        year: 2026,
        calculationMethod: 'PU',
      });
    expect(firstGenerate.status).toBe(201);
    const firstId = firstGenerate.body.data.id as string;

    const duplicate = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 3,
        year: 2026,
        calculationMethod: 'PU',
      });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('SETTLEMENT_EXISTS');

    const override = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 3,
        year: 2026,
        calculationMethod: 'PU',
        override: true,
      });
    expect(override.status).toBe(201);
    const secondId = override.body.data.id as string;
    expect(secondId).not.toBe(firstId);

    const firstDetail = await ctx.repository.getSettlementDetailById(firstId);
    expect(firstDetail?.status).toBe('OVERRIDDEN');
    expect(firstDetail?.superseded_by_settlement_id).toBe(secondId);
  });

  it('settlements: cross-month adjustment prevents double payment when method changes', async () => {
    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 800 });

    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        loadRefNumber: 'SETTLE-CROSS-1',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-01-31',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-02-02',
        rate: 1000,
        miles: 500,
      });
    expect(loadResponse.status).toBe(201);

    const january = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 1,
        year: 2026,
        calculationMethod: 'PU',
      });
    expect(january.status).toBe(201);
    expect(january.body.data.summary.tierBasisLoadCount).toBe(1);
    expect(january.body.data.summary.totalLoadCompensation).toBe(10);

    const february = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 2,
        year: 2026,
        calculationMethod: 'DELIVERY',
      });
    expect(february.status).toBe(201);
    expect(february.body.data.crossMonthLoads).toHaveLength(1);
    expect(february.body.data.crossMonthLoads[0].loadRefNumber).toBe('SETTLE-CROSS-1');
    expect(february.body.data.summary.tierBasisLoadCount).toBe(0);
    expect(february.body.data.summary.totalLoadCompensation).toBe(0);
    expect(february.body.data.summary.totalSettlementAmount).toBe(800);
  });

  it('settlements: legacy records expose null tierBasisLoadCount', async () => {
    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 700 });

    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        loadRefNumber: 'SETTLE-LEGACY-1',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-09-10',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-09-12',
        rate: 1000,
        miles: 500,
      });
    expect(loadResponse.status).toBe(201);

    const generateResponse = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 9,
        year: 2026,
        calculationMethod: 'PU',
      });
    expect(generateResponse.status).toBe(201);
    const settlementId = generateResponse.body.data.id as string;

    const repositoryWithDb = ctx.repository as unknown as {
      db: { query: (sql: string, params?: unknown[]) => Promise<void> };
    };
    await repositoryWithDb.db.query(`update settlements set tier_basis_load_count = null where id = $1`, [settlementId]);

    const detail = await ctx.request
      .get(`/api/customer-freight/settlements/${settlementId}`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(detail.status).toBe(200);
    expect(detail.body.data.summary.tierBasisLoadCount).toBeNull();

    const history = await ctx.request
      .get('/api/customer-freight/settlements?limit=100')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(history.status).toBe(200);
    const found = (history.body.data as Array<{ id: string; summary: { tierBasisLoadCount: number | null } }>).find(
      (row) => row.id === settlementId,
    );
    expect(found?.summary.tierBasisLoadCount).toBeNull();
  });

  it('settlements: PDF export returns a PDF payload', async () => {
    await ctx.request
      .patch(`/api/customer-freight/settlements/users/${ctx.users.accountManager.id}/default-flat-pay`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({ defaultFlatPay: 600 });

    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        loadRefNumber: 'SETTLE-PDF-1',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-05-10',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-05-11',
        rate: 1000,
        miles: 500,
      });
    expect(loadResponse.status).toBe(201);

    const generateResponse = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 5,
        year: 2026,
        calculationMethod: 'PU',
      });
    expect(generateResponse.status).toBe(201);

    const pdfResponse = await ctx.request
      .get(`/api/customer-freight/settlements/${generateResponse.body.data.id}/pdf`)
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager));
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers['content-type']).toContain('application/pdf');
    expect(pdfResponse.headers['content-disposition']).toContain(
      'attachment; filename="Statement May 2026 - Account Manager User.pdf"',
    );
    const bodyLength = Buffer.isBuffer(pdfResponse.body)
      ? pdfResponse.body.length
      : typeof pdfResponse.text === 'string'
        ? pdfResponse.text.length
        : 0;
    expect(bodyLength).toBeGreaterThan(100);
  });

  it('settlements: missing default flat pay blocks generation', async () => {
    const loadResponse = await ctx.request
      .post('/api/customer-freight/loads')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        customerId: ctx.customer.id,
        accountManagerId: ctx.users.accountManager.id,
        loadRefNumber: 'SETTLE-NO-FLAT-1',
        puCity: 'Chicago',
        puState: 'IL',
        puDate: '2026-04-10',
        delCity: 'Dallas',
        delState: 'TX',
        delDate: '2026-04-11',
        rate: 1000,
        miles: 500,
      });
    expect(loadResponse.status).toBe(201);

    const response = await ctx.request
      .post('/api/customer-freight/settlements/generate')
      .set('x-test-session', ctx.sessionHeaderFor(ctx.users.manager))
      .send({
        userId: ctx.users.accountManager.id,
        month: 4,
        year: 2026,
        calculationMethod: 'PU',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
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
