import type { Response } from 'express';
import jwt from 'jsonwebtoken';

import type { SessionUser } from '@antigravity/shared';

import { SESSION_COOKIE_NAME, config } from './config.js';

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function signSession(user: SessionUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySession(token: string): SessionUser {
  return jwt.verify(token, config.jwtSecret) as SessionUser;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
  });
}