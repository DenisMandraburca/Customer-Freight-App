import type { SessionUser } from '@/types/models';

import { unwrap } from './http';

export function startGoogleAuth(): void {
  window.location.href = '/api/auth/google/start';
}

export async function getCurrentSession(): Promise<SessionUser> {
  return unwrap<SessionUser>('/api/me');
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}