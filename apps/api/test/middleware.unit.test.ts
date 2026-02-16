import { describe, expect, it, vi } from 'vitest';

import type { NextFunction, Request, Response } from 'express';

import { checkCompanyDomain } from '../src/middleware/checkCompanyDomain.js';
import { requireRole } from '../src/middleware/auth.js';

function mockResponse(): Response {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  return response;
}

describe('checkCompanyDomain middleware', () => {
  it('allows afctransport.com emails', () => {
    const req = { user: { email: 'user@afctransport.com' } } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    checkCompanyDomain(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects non-company domains', () => {
    const req = { user: { email: 'user@gmail.com' } } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    checkCompanyDomain(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireRole middleware', () => {
  it('permits allowed roles', () => {
    const middleware = requireRole('MANAGER');
    const req = { user: { role: 'MANAGER' } } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks disallowed roles', () => {
    const middleware = requireRole('MANAGER');
    const req = { user: { role: 'DISPATCHER' } } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});