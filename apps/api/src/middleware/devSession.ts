import type { NextFunction, Request, RequestHandler, Response } from 'express';

const DEV_SESSION_HEADER = 'x-dev-session';
const LEGACY_DEV_SESSION_HEADER = 'x-test-session';

const DEFAULT_DEV_SESSION_ID = 'dev-local-user';
const DEFAULT_DEV_SESSION_EMAIL = 'local.admin@afctransport.com';
const DEFAULT_DEV_SESSION_NAME = 'Local Dev Admin';
const DEFAULT_DEV_SESSION_PERMISSIONS = ['customer-freight:access', 'customer-freight:admin'];

type PortalUserSession = NonNullable<Request['userSession']>;

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = trimToNull(value)?.toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePermissions(value: string | undefined): string[] {
  const parsed = value
    ?.split(',')
    .map((permission) => permission.trim())
    .filter(Boolean);

  if (!parsed || parsed.length === 0) {
    return [...DEFAULT_DEV_SESSION_PERMISSIONS];
  }

  return parsed;
}

function parsePortalUserSession(payload: unknown): PortalUserSession | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const name = typeof record.name === 'string' ? record.name.trim() : null;
  const isSuperAdmin = typeof record.isSuperAdmin === 'boolean' ? record.isSuperAdmin : false;
  const permissions = Array.isArray(record.permissions)
    ? record.permissions
        .map((permission) => (typeof permission === 'string' ? permission.trim() : ''))
        .filter(Boolean)
    : [];

  if (!id || !email || permissions.length === 0) {
    return null;
  }

  return {
    id,
    email,
    name: name || null,
    isSuperAdmin,
    permissions,
  };
}

function parseSessionHeader(raw: string): PortalUserSession | null {
  const candidates = [raw];

  try {
    candidates.unshift(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    // Treat header as plain JSON if base64url decoding fails.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const session = parsePortalUserSession(parsed);
      if (session) {
        return session;
      }
    } catch {
      // Ignore invalid candidate and continue.
    }
  }

  return null;
}

function cloneSession(session: PortalUserSession): PortalUserSession {
  return {
    id: session.id,
    email: session.email,
    name: session.name,
    isSuperAdmin: session.isSuperAdmin,
    permissions: [...session.permissions],
  };
}

function resolveFallbackSession(): PortalUserSession {
  return {
    id: trimToNull(process.env.DEV_SESSION_ID) ?? DEFAULT_DEV_SESSION_ID,
    email: (trimToNull(process.env.DEV_SESSION_EMAIL) ?? DEFAULT_DEV_SESSION_EMAIL).toLowerCase(),
    name: trimToNull(process.env.DEV_SESSION_NAME) ?? DEFAULT_DEV_SESSION_NAME,
    isSuperAdmin: parseBoolean(process.env.DEV_SESSION_SUPER_ADMIN, false),
    permissions: parsePermissions(process.env.DEV_SESSION_PERMISSIONS),
  };
}

function readSessionHeader(req: Request): string | null {
  const explicit = trimToNull(req.header(DEV_SESSION_HEADER));
  if (explicit) {
    return explicit;
  }

  return trimToNull(req.header(LEGACY_DEV_SESSION_HEADER));
}

function invalidSessionHeaderResponse(res: Response): void {
  res.status(400).json({
    success: false,
    error: 'INVALID_DEV_SESSION',
    message: `${DEV_SESSION_HEADER} must be a valid JSON object (or base64url-encoded JSON).`,
  });
}

export function createDevPortalSessionMiddleware(): RequestHandler | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  if (!parseBoolean(process.env.DEV_AUTH_ENABLED, true)) {
    return undefined;
  }

  const fallbackSession = resolveFallbackSession();

  return function devPortalSessionMiddleware(req: Request, res: Response, next: NextFunction): void {
    const rawHeader = readSessionHeader(req);

    if (rawHeader) {
      const parsed = parseSessionHeader(rawHeader);
      if (!parsed) {
        invalidSessionHeaderResponse(res);
        return;
      }

      req.userSession = parsed;
      next();
      return;
    }

    if (!req.userSession) {
      req.userSession = cloneSession(fallbackSession);
    }

    next();
  };
}
