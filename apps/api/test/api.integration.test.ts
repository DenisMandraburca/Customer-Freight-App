import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TestContext } from './helpers.js';
import { bootTestContext } from './helpers.js';

describe('API integration', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await bootTestContext();
  });

  afterEach(async () => {
    if (ctx) {
      await ctx.cleanup();
    }
  });

  it('POST /api/loads calculates RPM and creates a load', async () => {
    const response = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
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
        notes: 'Fragile freight',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('AVAILABLE');
    expect(Number(response.body.data.rpm)).toBe(2);
  });

  it('POST /api/book sets load status to PENDING_APPROVAL and assigns truck/driver', async () => {
    const createResponse = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
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

    const loadId = createResponse.body.data.id;

    const bookResponse = await ctx.request
      .post('/api/book')
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        loadId,
        truckNumber: 'TRK-7',
        driverName: 'Driver A',
      });

    expect(bookResponse.status).toBe(200);
    expect(bookResponse.body.data.status).toBe('PENDING_APPROVAL');
    expect(bookResponse.body.data.truck_number).toBe('TRK-7');
    expect(bookResponse.body.data.driver_name).toBe('Driver A');
  });

  it('POST /api/loads/:id/decision accept moves PENDING_APPROVAL load to COVERED', async () => {
    const createResponse = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1003',
        puCity: 'Denver',
        puState: 'CO',
        delCity: 'Phoenix',
        delState: 'AZ',
        rate: 1500,
        miles: 750,
      });

    const loadId = createResponse.body.data.id;

    await ctx.request
      .post('/api/book')
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        loadId,
        truckNumber: 'TRK-8',
        driverName: 'Driver B',
      });

    const decideResponse = await ctx.request
      .post(`/api/loads/${loadId}/decision`)
      .set('Cookie', [ctx.cookieFor(ctx.users.manager)])
      .send({
        decision: 'accept',
        notes: 'Approved by manager',
      });

    expect(decideResponse.status).toBe(200);
    expect(decideResponse.body.data.status).toBe('COVERED');
  });

  it('POST /api/loads/:id/quote creates QUOTE_SUBMITTED with requested_pickup_date', async () => {
    const createResponse = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-1004',
        puCity: 'Pittsburgh',
        puState: 'PA',
        delCity: 'Columbus',
        delState: 'OH',
        rate: 900,
        miles: 300,
      });

    const loadId = createResponse.body.data.id as string;

    const quoteResponse = await ctx.request
      .post(`/api/loads/${loadId}/quote`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        pickupDate: '2026-02-20',
      });

    expect(quoteResponse.status).toBe(201);
    expect(quoteResponse.body.data.status).toBe('QUOTE_SUBMITTED');
    expect(quoteResponse.body.data.requested_pickup_date).toBe('2026-02-20');
  });

  it('quote accept updates PU/DEL dates and optional ref/mcleod fields', async () => {
    const createResponse = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
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
      .post(`/api/loads/${loadId}/quote`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        pickupDate: '2026-02-21',
      });

    const decisionResponse = await ctx.request
      .post(`/api/loads/${loadId}/decision`)
      .set('Cookie', [ctx.cookieFor(ctx.users.manager)])
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

  it('POST /api/decide deny restores AVAILABLE and increments Greenbush remaining_count', async () => {
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
      .post('/api/greenbush/quote')
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        greenbushId: greenbush.id,
        pickupDate: '2026-02-13',
        truckNumber: 'GB-1',
        driverName: 'Green Driver',
      });

    expect(quoteResponse.status).toBe(201);
    const loadId = quoteResponse.body.data.id;

    const midRows = await ctx.repository.listGreenbush();
    const mid = midRows.find((row) => row.id === greenbush.id);
    expect(mid?.remaining_count).toBe(0);

    const denyResponse = await ctx.request
      .post('/api/decide')
      .set('Cookie', [ctx.cookieFor(ctx.users.manager)])
      .send({
        loadId,
        decision: 'deny',
        notes: 'Denied for test',
      });

    expect(denyResponse.status).toBe(200);
    expect(denyResponse.body.data.status).toBe('AVAILABLE');

    const afterRows = await ctx.repository.listGreenbush();
    const after = afterRows.find((row) => row.id === greenbush.id);
    expect(after?.remaining_count).toBe(1);
  });

  it('PATCH /api/loads/:id/status enforces reason for DELAYED and CANCELED', async () => {
    const createResponse = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)])
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
      .post('/api/book')
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        loadId,
        truckNumber: 'TRK-9',
        driverName: 'Driver C',
      });

    await ctx.request
      .post(`/api/loads/${loadId}/decision`)
      .set('Cookie', [ctx.cookieFor(ctx.users.manager)])
      .send({
        decision: 'accept',
      });

    const missingReason = await ctx.request
      .patch(`/api/loads/${loadId}/status`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        status: 'DELAYED',
      });

    expect(missingReason.status).toBe(400);

    const delayed = await ctx.request
      .patch(`/api/loads/${loadId}/status`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        status: 'DELAYED',
        reason: 'Weather delay',
      });

    expect(delayed.status).toBe(200);
    expect(delayed.body.data.delay_reason).toBe('Weather delay');

    const canceledWithoutReason = await ctx.request
      .patch(`/api/loads/${loadId}/status`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        status: 'CANCELED',
      });

    expect(canceledWithoutReason.status).toBe(400);

    const canceled = await ctx.request
      .patch(`/api/loads/${loadId}/status`)
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        status: 'CANCELED',
        reason: 'Customer canceled',
      });

    expect(canceled.status).toBe(200);
    expect(canceled.body.data.cancel_reason).toBe('Customer canceled');
  });

  it('upsertUserFromGoogle defaults a new user to VIEWER', async () => {
    const user = await ctx.repository.upsertUserFromGoogle('new.user@afctransport.com', 'New User');
    expect(user.role).toBe('VIEWER');
  });

  it('Greenbush quote transaction allows only one success at remaining_count=1', async () => {
    const greenbush = await ctx.repository.createGreenbush({
      pickupLocation: 'Buffalo',
      destination: 'Albany',
      receivingHours: '06:00 - 14:00',
      price: 950,
      tarp: 'N',
      remainingCount: 1,
      specialNotes: 'Concurrent test',
    });

    const requestBody = {
      greenbushId: greenbush.id,
      pickupDate: '2026-02-14',
      truckNumber: 'GB-2',
      driverName: 'Driver C',
    };

    const [r1, r2] = await Promise.all([
      ctx.request.post('/api/greenbush/quote').set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)]).send(requestBody),
      ctx.request.post('/api/greenbush/quote').set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)]).send(requestBody),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const rows = await ctx.repository.listGreenbush();
    const row = rows.find((item) => item.id === greenbush.id);
    expect(row?.remaining_count).toBe(0);
  });

  it('checkCompanyDomain blocks authenticated users outside allowed domains', async () => {
    const outsider = await ctx.repository.createUser({
      email: 'outsider@gmail.com',
      name: 'Outsider',
      role: 'DISPATCHER',
    });

    const response = await ctx.request
      .get('/api/me')
      .set('Cookie', [ctx.cookieFor(outsider)]);

    expect(response.status).toBe(403);
  });

  it('VIEWER cannot call mutating endpoints', async () => {
    const viewer = await ctx.repository.createUser({
      email: 'viewer@afctransport.com',
      name: 'Viewer User',
      role: 'VIEWER',
    });

    const response = await ctx.request
      .post('/api/loads')
      .set('Cookie', [ctx.cookieFor(viewer)])
      .send({
        customerId: ctx.customer.id,
        loadRefNumber: 'LD-VIEW',
        puCity: 'Cincinnati',
        puState: 'OH',
        delCity: 'Louisville',
        delState: 'KY',
        rate: 500,
        miles: 100,
      });

    expect(response.status).toBe(403);
  });

  it('DISPATCHER cannot manage users', async () => {
    const response = await ctx.request
      .post('/api/users')
      .set('Cookie', [ctx.cookieFor(ctx.users.dispatcher)])
      .send({
        email: 'new.dispatch@afctransport.com',
        name: 'No Access',
        role: 'DISPATCHER',
      });

    expect(response.status).toBe(403);
  });

  it('ACCOUNT_MANAGER cannot ban users', async () => {
    const target = await ctx.repository.createUser({
      email: 'target.user@afctransport.com',
      name: 'Target User',
      role: 'VIEWER',
    });

    const response = await ctx.request
      .post(`/api/users/${target.id}/ban`)
      .set('Cookie', [ctx.cookieFor(ctx.users.accountManager)]);

    expect(response.status).toBe(403);
  });

  it('ADMIN can perform full admin operations', async () => {
    const admin = await ctx.repository.createUser({
      email: 'admin@afctransport.com',
      name: 'Admin User',
      role: 'ADMIN',
    });

    const createdUser = await ctx.request
      .post('/api/users')
      .set('Cookie', [ctx.cookieFor(admin)])
      .send({
        email: 'created.by.admin@afctransport.com',
        name: 'Created By Admin',
        role: 'VIEWER',
      });

    expect(createdUser.status).toBe(201);

    const ban = await ctx.request
      .post(`/api/users/${createdUser.body.data.id}/ban`)
      .set('Cookie', [ctx.cookieFor(admin)]);

    expect(ban.status).toBe(200);
    expect(ban.body.data.role).toBe('BANNED');
  });
});
