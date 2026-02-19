import type { SessionUser } from '@antigravity/shared';

export interface PortalUserSession {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      userSession?: PortalUserSession;
    }
  }
}

export {};
