import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { SessionUser } from '@/types/models';

import { getCurrentSession, logout } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  async function refreshSession(): Promise<SessionUser | null> {
    loading.value = true;

    try {
      const current = await getCurrentSession();
      user.value = current;
      return current;
    } catch {
      user.value = null;
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
  }

  return {
    user,
    loading,
    initialized,
    isAuthenticated,
    refreshSession,
    ensureSession,
    logoutSession,
  };
});