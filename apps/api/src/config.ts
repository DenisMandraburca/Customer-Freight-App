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
  appUrl: process.env.APP_URL ?? 'http://localhost:5174',
  apiUrl: process.env.API_URL ?? 'http://localhost:8787',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  cookieDomain: process.env.COOKIE_DOMAIN ?? 'localhost',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:8787/api/auth/google/callback',
  companyDomains: parseCompanyDomains(process.env.COMPANY_DOMAINS),
} as const;

export const SESSION_COOKIE_NAME = 'cfa_session';
