import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '@antigravity/db';

import { config } from '../config.js';

const ALLOWED = new Set(config.companyDomains.map((domain) => domain.toLowerCase()));

export function checkCompanyDomain(req: Request, res: Response, next: NextFunction): void {
  const email = req.user?.email ?? req.userSession?.email;

  if (!email || !email.includes('@')) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email is required for domain validation.',
    });
    return;
  }

  const domain = email.split('@')[1]!.trim().toLowerCase();

  if (!ALLOWED.has(domain)) {
    const allowedDomains = [...ALLOWED];
    res.status(403).json({
      success: false,
      error: 'PERMISSION_DENIED',
      message: `Unauthorized domain. Only ${allowedDomains.join(' or ')} are allowed.`,
    });
    return;
  }

  next();
}

export function assertCompanyDomain(email: string): void {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain || !ALLOWED.has(domain)) {
    const allowedDomains = [...ALLOWED];
    throw new HttpError(
      `Unauthorized domain. Only ${allowedDomains.join(' or ')} are allowed.`,
      403,
      'PERMISSION_DENIED',
    );
  }
}
