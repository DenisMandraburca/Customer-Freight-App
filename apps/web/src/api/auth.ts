import type { SessionUser } from '@/types/models';

import { unwrap } from './http';

const API_BASE = '/api/customer-freight';

export function startPortalAuth(): void {
  window.location.href = '/apps/hub/login';
}

export async function getCurrentSession(): Promise<SessionUser> {
  return unwrap<SessionUser>(`${API_BASE}/me`);
}

export async function logout(): Promise<void> {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}
