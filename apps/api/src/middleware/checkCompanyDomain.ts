import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';

const ALLOWED = new Set(config.companyDomains.map((domain) => domain.toLowerCase()));

export function checkCompanyDomain(req: Request, res: Response, next: NextFunction): void {
  const email = req.authEmail ?? req.user?.email;

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Email is required for domain validation.' });
    return;
  }

  const domain = email.split('@')[1]!.trim().toLowerCase();

  if (!ALLOWED.has(domain)) {
    const allowedDomains = [...ALLOWED];
    res.status(403).json({
      error: `Unauthorized domain. Only ${allowedDomains.join(' or ')} are allowed.`,
    });
    return;
  }

  next();
}

export function assertCompanyDomain(email: string): void {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain || !ALLOWED.has(domain)) {
    const allowedDomains = [...ALLOWED];
    throw new Error(`Unauthorized domain. Only ${allowedDomains.join(' or ')} are allowed.`);
  }
}
