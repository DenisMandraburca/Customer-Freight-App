import type { SessionUser } from '@antigravity/shared';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      authEmail?: string;
      oauthProfile?: {
        email: string;
        name: string;
        emailVerified: boolean;
      };
    }
  }
}

export {};
