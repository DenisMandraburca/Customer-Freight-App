import { createRouter, createWebHistory } from 'vue-router';

import { pinia } from '@/pinia';
import { useAuthStore } from '@/stores/auth';

const LoginView = () => import('@/views/LoginView.vue');
const DashboardView = () => import('@/views/DashboardView.vue');
const BannedView = () => import('@/views/BannedView.vue');

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/banned',
      name: 'banned',
      component: BannedView,
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  await auth.ensureSession();

  if (auth.isBanned && to.name !== 'banned') {
    return { name: 'banned' };
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    window.location.href = '/apps/hub/login';
    return false;
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }

  if (to.name === 'banned' && !auth.isBanned) {
    return { name: 'login' };
  }

  return true;
});
