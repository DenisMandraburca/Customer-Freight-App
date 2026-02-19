import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_THEME_KEY = 'antigravity-theme';
const STORAGE_NAV_KEY = 'antigravity-nav-collapsed';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface UiToast {
  id: number;
  message: string;
  type: ToastType;
}

export const useUiStore = defineStore('ui', () => {
  const darkMode = ref(localStorage.getItem(STORAGE_THEME_KEY) === 'dark');
  const navCollapsed = ref(localStorage.getItem(STORAGE_NAV_KEY) === 'true');
  const toasts = ref<UiToast[]>([]);
  const nextToastId = ref(1);

  watch(
    darkMode,
    (value) => {
      localStorage.setItem(STORAGE_THEME_KEY, value ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', value);
    },
    { immediate: true },
  );

  watch(navCollapsed, (value) => {
    localStorage.setItem(STORAGE_NAV_KEY, value ? 'true' : 'false');
  });

  const sidebarWidthClass = computed(() => (navCollapsed.value ? 'w-20' : 'w-72'));

  function toggleTheme(): void {
    darkMode.value = !darkMode.value;
  }

  function toggleNav(): void {
    navCollapsed.value = !navCollapsed.value;
  }

  function dismissToast(toastId: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== toastId);
  }

  function showToast(message: string, type: ToastType): void {
    const toast: UiToast = {
      id: nextToastId.value,
      message,
      type,
    };

    nextToastId.value += 1;
    toasts.value.push(toast);

    const timeoutMs = type === 'warning' ? 5000 : 3000;
    window.setTimeout(() => {
      dismissToast(toast.id);
    }, timeoutMs);
  }

  return {
    darkMode,
    navCollapsed,
    sidebarWidthClass,
    toasts,
    toggleTheme,
    toggleNav,
    dismissToast,
    showToast,
  };
});
