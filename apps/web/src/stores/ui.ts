import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

const STORAGE_THEME_KEY = 'antigravity-theme';
const STORAGE_NAV_KEY = 'antigravity-nav-collapsed';

export const useUiStore = defineStore('ui', () => {
  const darkMode = ref(localStorage.getItem(STORAGE_THEME_KEY) === 'dark');
  const navCollapsed = ref(localStorage.getItem(STORAGE_NAV_KEY) === 'true');

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

  return {
    darkMode,
    navCollapsed,
    sidebarWidthClass,
    toggleTheme,
    toggleNav,
  };
});