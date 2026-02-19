import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { SessionUser } from '@/types/models';

import { getCurrentSession, logout } from '@/api/auth';
import { ApiRequestError } from '@/api/http';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const isBanned = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  async function refreshSession(): Promise<SessionUser | null> {
    loading.value = true;

    try {
      const current = await getCurrentSession();
      user.value = current;
      isBanned.value = false;
      return current;
    } catch (error) {
      user.value = null;
      if (error instanceof ApiRequestError) {
        isBanned.value = error.code === 'PERMISSION_DENIED' && /banned/i.test(error.message);
      } else {
        isBanned.value = false;
      }
      return null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  async function ensureSession(): Promise<void> {
    if (!initialized.value) {
      await refreshSession();
    }
  }

  async function logoutSession(): Promise<void> {
    await logout();
    user.value = null;
    initialized.value = true;
    isBanned.value = false;
  }

  return {
    user,
    loading,
    initialized,
    isBanned,
    isAuthenticated,
    refreshSession,
    ensureSession,
    logoutSession,
  };
});
