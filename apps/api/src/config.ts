import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { COMPANY_DOMAINS } from '@antigravity/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(workspaceRoot, '.env') });

function parseCompanyDomains(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) {
    return [...COMPANY_DOMAINS];
  }

  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8787),
  apiBasePath: process.env.API_BASE_PATH ?? '/api/customer-freight',
  logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  appUrl: process.env.APP_URL ?? 'http://localhost:5174',
  apiUrl: process.env.API_URL ?? 'http://localhost:8787',
  companyDomains: parseCompanyDomains(process.env.COMPANY_DOMAINS),
} as const;

export const ACCESS_PERMISSION = 'customer-freight:access';
export const ADMIN_PERMISSION = 'customer-freight:admin';
