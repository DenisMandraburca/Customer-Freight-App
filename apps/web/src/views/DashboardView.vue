<template>
  <div class="min-h-screen px-3 py-3 md:px-4 md:py-4">
    <div class="mx-auto flex min-h-[94vh] max-w-[1700px] items-start gap-3">
      <aside class="sticky top-3 h-[calc(100vh-1.5rem)] shrink-0 overflow-hidden glass-panel rounded-2xl p-3" :class="ui.sidebarWidthClass">
        <div class="flex h-full flex-col">
          <div class="mb-4 flex items-center justify-between px-1">
            <div class="flex items-center gap-2" :class="{ 'sr-only': ui.navCollapsed }">
              <img src="https://afctransport.com/wp-content/themes/AFC/img/logo.png" alt="AFC" class="brand-logo h-6 w-auto" />
              <h1 class="text-xs font-black tracking-[0.2em] text-zinc-900 dark:text-zinc-50">AFC OPS</h1>
            </div>
            <button class="brand-button flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold" @click="ui.toggleNav">
              <ChevronRight v-if="ui.navCollapsed" class="h-3.5 w-3.5" />
              <ChevronLeft v-else class="h-3.5 w-3.5" />
            </button>
          </div>

          <nav class="flex-1 space-y-1 overflow-y-auto pr-1">
            <button
              v-for="item in navItems"
              :key="item.id"
              class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-all"
              :class="activeTab === item.id ? 'bg-red-700 text-white shadow-sm dark:bg-red-600' : 'text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/50'"
              @click="activeTab = item.id"
            >
              <span class="flex items-center gap-2.5">
                <span class="flex w-5 justify-center">
                  <component :is="item.icon" class="h-4 w-4" />
                </span>
                <span v-if="!ui.navCollapsed">{{ item.label }}</span>
              </span>
              <span
                v-if="item.badge && !ui.navCollapsed"
                class="rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors"
                :class="activeTab === item.id ? 'bg-white/20 text-white' : 'bg-red-600 text-white'"
              >
                {{ item.badge }}
              </span>
            </button>
          </nav>

          <div class="mt-auto space-y-1 border-t border-zinc-200/50 pt-4 dark:border-zinc-800/50">
            <button class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/50" @click="ui.toggleTheme">
              <span class="flex w-5 justify-center">
                <Sun v-if="ui.darkMode" class="h-4 w-4" />
                <Moon v-else class="h-4 w-4" />
              </span>
              <span v-if="!ui.navCollapsed">{{ ui.darkMode ? 'Light' : 'Dark' }} Mode</span>
            </button>
            <button class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" @click="handleLogout">
              <span class="flex w-5 justify-center">
                <LogOut class="h-4 w-4" />
              </span>
              <span v-if="!ui.navCollapsed">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main class="flex h-[calc(100vh-1.5rem)] flex-1 flex-col gap-3 overflow-hidden">
        <header class="glass-panel rounded-2xl px-5 py-3.5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500">Operations Dashboard</p>
              <h2 class="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Welcome, {{ currentUser?.name }}</h2>
            </div>
            <div class="rounded-lg bg-zinc-900/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-700 ring-1 ring-inset ring-zinc-900/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
              {{ roleLabel(currentUser?.role) }}
            </div>
          </div>
        </header>

        <section class="flex flex-1 flex-col overflow-hidden rounded-2xl glass-panel">
          <div class="flex-1 overflow-auto p-4">
            <div v-if="query.isLoading.value" class="flex h-32 items-center justify-center text-xs font-medium text-zinc-600">Loading data...</div>
            <div v-else-if="query.isError.value" class="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{{ (query.error.value as Error).message }}</div>
            <template v-else>
              <div v-if="errorMsg" class="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{{ errorMsg }}</div>
              <NewLoadTab
                v-if="activeTab === 'new-load'"
                :customers="customers"
                :dispatchers="users.filter((user) => user.role === 'DISPATCHER')"
                :current-user-name="currentUser?.name ?? ''"
                @load-created="refreshData"
              />
              <AvailableLoadsTab
                v-else-if="activeTab === 'available'"
                :loads="loads"
                :greenbush="greenbush"
                :can-book="canBook"
                :can-quote="canQuoteLoads"
                :can-quote-greenbush="canQuoteGreenbush"
                :role="role"
                @book="bookPrompt"
                @quote="quotePrompt"
                @quote-greenbush="greenbushQuotePrompt"
                @save-specs="saveSpecsAction"
              />
              <MyLoadsTab
                v-else-if="activeTab === 'my-loads'"
                :loads="loads"
                :user="currentUser"
                :can-decide="canDecide"
                :can-update-status="canUpdateStatus"
                @decide-load="decisionAction"
                @set-status="statusPrompt"
                @save-specs="saveSpecsAction"
              />
              <AllLoadsTab
                v-else-if="activeTab === 'all-loads'"
                :loads="loads"
                :customers="customers"
                :users="users"
                :can-edit="canEditLoads"
                :current-user="currentUser"
              />
              <CustomersTab
                v-else-if="activeTab === 'customers'"
                :customers="customers"
                :can-manage="canManageCustomers"
                @create="createCustomerAction"
                @update="updateCustomerAction"
                @delete="deleteCustomerAction"
              />
              <UsersTab
                v-else-if="activeTab === 'users'"
                :users="users"
                :can-manage="canManageUsers"
                :current-user-id="currentUser?.sub ?? ''"
                @create="createUserAction"
                @update="updateUserAction"
                @delete="deleteUserAction"
                @ban="banUserAction"
              />
              <GreenbushTab
                v-else-if="activeTab === 'greenbush'"
                :rows="greenbush"
                :can-manage="canManageGreenbush"
                :can-quote="canQuoteGreenbush"
                @open-quote="greenbushQuotePrompt"
                @create="createGreenbushAction"
                @update="updateGreenbushAction"
                @delete="deleteGreenbushAction"
                @increment="incrementGreenbushAction"
                @bulk-replace="bulkReplaceGreenbushAction"
              />
              <LoadChatTab
                v-else-if="activeTab === 'load-chat'"
                :current-user="currentUser"
              />
              <ReportsTab
                v-else
                :loads="loads"
                :customers="customers"
                :users="users"
                :current-user="currentUser"
                :is-refreshing="query.isFetching.value"
                @refresh="refreshData"
              />
            </template>
          </div>
        </section>
      </main>
    </div>

    <div v-if="showBookModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Book Load</h4>
          <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeBookModal">X</button>
        </div>
        <div class="mt-3 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Truck Number
            <input
              v-model="bookModal.truckNumber"
              type="text"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Driver Name
            <input
              v-model="bookModal.driverName"
              type="text"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeBookModal">Cancel</button>
          <button type="button" class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800" @click="submitBookModal">Submit</button>
        </div>
      </div>
    </div>

    <div v-if="showQuoteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Submit Quote</h4>
          <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeQuoteModal">X</button>
        </div>
        <div class="mt-3 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Requested Pickup Date
            <div class="mt-1 flex items-center gap-2">
              <input
                v-model="quoteModal.pickupDate"
                type="date"
                class="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                class="shrink-0 rounded border border-zinc-300 px-2 py-1.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="setQuoteNextDay"
              >
                Next Day
              </button>
            </div>
          </label>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeQuoteModal">Cancel</button>
          <button type="button" class="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800" @click="submitQuoteModal">Submit</button>
        </div>
      </div>
    </div>

    <div v-if="showGreenbushQuoteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Submit Greenbush Quote</h4>
          <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeGreenbushQuoteModal">X</button>
        </div>
        <div class="mt-3 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Pickup Date
            <div class="mt-1 flex items-center gap-2">
              <input
                v-model="greenbushQuoteModal.pickupDate"
                type="date"
                class="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                class="shrink-0 rounded border border-zinc-300 px-2 py-1.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="setGreenbushQuoteNextDay"
              >
                Next Day
              </button>
            </div>
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Truck Number
            <input
              v-model="greenbushQuoteModal.truckNumber"
              type="text"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Driver Name (Optional)
            <input
              v-model="greenbushQuoteModal.driverName"
              type="text"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeGreenbushQuoteModal">Cancel</button>
          <button type="button" class="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800" @click="submitGreenbushQuoteModal">Submit</button>
        </div>
      </div>
    </div>

    <div class="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      <div
        v-for="toast in ui.toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-lg px-3 py-2 text-sm font-semibold text-white shadow"
        :class="toastClass(toast.type)"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';

import {
  banUser,
  bookLoad,
  bulkReplaceGreenbush,
  createCustomer,
  createGreenbush,
  createUser,
  decideLoad,
  deleteCustomer,
  deleteGreenbush,
  deleteUser,
  getInitialData,
  getChatLoads,
  incrementGreenbush,
  quoteGreenbush,
  quoteLoad,
  updateCustomer,
  updateGreenbush,
  updateLoad,
  updateLoadStatus,
  updateUser,
  type GreenbushMutationPayload,
} from '@/api/freight';
import { redirectToPortalLogin } from '@/config/runtime';
import { useAuthStore } from '@/stores/auth';
import { useUiStore, type ToastType } from '@/stores/ui';
import type { SessionUser, UserRecord } from '@/types/models';
import AllLoadsTab from './dashboard/AllLoadsTab.vue';
import AvailableLoadsTab from './dashboard/AvailableLoadsTab.vue';
import CustomersTab from './dashboard/CustomersTab.vue';
import GreenbushTab from './dashboard/GreenbushTab.vue';
import MyLoadsTab from './dashboard/MyLoadsTab.vue';
import NewLoadTab from './dashboard/NewLoadTab.vue';
import LoadChatTab from './dashboard/LoadChatTab.vue';
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Leaf,
  List,
  LogOut,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Settings,
  Sun,
  Users,
} from 'lucide-vue-next';
import ReportsTab from './dashboard/ReportsTab.vue';
import UsersTab from './dashboard/UsersTab.vue';

type TabId = 'new-load' | 'available' | 'my-loads' | 'all-loads' | 'customers' | 'users' | 'greenbush' | 'load-chat' | 'reports';

const router = useRouter();
const queryClient = useQueryClient();
const auth = useAuthStore();
const ui = useUiStore();

const activeTab = ref<TabId>('available');
const busy = ref(false);
const errorMsg = ref('');
const showBookModal = ref(false);
const showQuoteModal = ref(false);
const showGreenbushQuoteModal = ref(false);

const bookModal = reactive({
  loadId: '',
  truckNumber: '',
  driverName: '',
});

const quoteModal = reactive({
  loadId: '',
  basePickupDate: '',
  pickupDate: '',
});

const greenbushQuoteModal = reactive({
  greenbushId: '',
  basePickupDate: '',
  pickupDate: '',
  truckNumber: '',
  driverName: '',
});

const currentUser = computed<SessionUser | null>(() => auth.user);
const role = computed(() => currentUser.value?.role ?? 'VIEWER');

const query = useQuery({
  queryKey: ['initial-data'],
  queryFn: () => getInitialData(),
  refetchInterval: () => {
    if (activeTab.value === 'available') {
      return role.value === 'VIEWER' ? 60000 : 30000;
    }
    return 10000;
  },
});

watch(
  () => query.data.value?.currentUser,
  (value) => {
    if (value) {
      auth.user = value;
    }
  },
  { immediate: true },
);

const loads = computed(() => query.data.value?.loads ?? []);
const customers = computed(() => query.data.value?.customers ?? []);
const users = computed<UserRecord[]>(() => query.data.value?.users ?? []);
const greenbush = computed(() => query.data.value?.greenbush ?? []);

const isAdminLike = computed(() => role.value === 'ADMIN' || role.value === 'MANAGER');
const isAccountManager = computed(() => role.value === 'ACCOUNT_MANAGER');
const accountManagerHasFullAccess = computed(() => Boolean(currentUser.value?.full_load_access));

const canCreateLoad = computed(() => isAdminLike.value || isAccountManager.value);
const canBook = computed(() => isAdminLike.value || role.value === 'DISPATCHER');
const canQuoteLoads = computed(() => canBook.value);
const canQuoteGreenbush = computed(() => isAdminLike.value || isAccountManager.value || role.value === 'DISPATCHER');
const canDecide = computed(() => isAdminLike.value || isAccountManager.value || role.value === 'DISPATCHER');
const canUpdateStatus = computed(() => isAdminLike.value || isAccountManager.value || role.value === 'DISPATCHER');
const canEditLoads = computed(() => isAdminLike.value || isAccountManager.value);
const canManageCustomers = computed(() => isAdminLike.value || (isAccountManager.value && accountManagerHasFullAccess.value));
const canManageUsers = computed(() => isAdminLike.value);
const canManageGreenbush = computed(() => isAdminLike.value);
const canViewCustomersTab = computed(() => canManageCustomers.value);
const canViewUsersTab = computed(() => canManageUsers.value);
const canViewGreenbushTab = computed(() => canManageGreenbush.value);
const canViewLoadChatTab = computed(() => isAdminLike.value || isAccountManager.value || role.value === 'DISPATCHER');
const canViewReportsTab = computed(() => isAdminLike.value || isAccountManager.value);
const canViewAllLoadsTab = computed(() => isAdminLike.value || isAccountManager.value);
const canViewMyLoadsTab = computed(() => role.value === 'DISPATCHER' || isAdminLike.value || isAccountManager.value);
const canViewNewLoadTab = computed(() => canCreateLoad.value);

const pendingBadge = computed(() =>
  loads.value.filter((load) => load.status === 'PENDING_APPROVAL' || load.status === 'QUOTE_SUBMITTED').length,
);

const chatBadgeQuery = useQuery({
  queryKey: ['chat-loads-badge'],
  queryFn: () => getChatLoads(),
  enabled: canViewLoadChatTab,
  refetchInterval: 10000,
});

const chatUnreadBadge = computed(() => {
  const rows = chatBadgeQuery.data.value ?? [];
  return rows.reduce((total, row) => total + (row.unread_count ?? 0), 0);
});

const navItems = computed(() => {
  const items: Array<{ id: TabId; label: string; icon: any; badge?: number }> = [];

  if (canViewNewLoadTab.value) {
    items.push({ id: 'new-load', label: 'New Load', icon: Plus });
  }
  items.push({ id: 'available', label: 'Available', icon: Package });
  if (canViewMyLoadsTab.value) {
    items.push({ id: 'my-loads', label: 'My Loads', icon: Briefcase, badge: pendingBadge.value });
  }
  if (canViewAllLoadsTab.value) {
    items.push({ id: 'all-loads', label: 'All Loads', icon: List });
  }
  if (canViewCustomersTab.value) {
    items.push({ id: 'customers', label: 'Customers', icon: Users });
  }
  if (canViewUsersTab.value) {
    items.push({ id: 'users', label: 'Settings', icon: Settings });
  }
  if (canViewGreenbushTab.value) {
    items.push({ id: 'greenbush', label: 'Greenbush', icon: Leaf });
  }
  if (canViewLoadChatTab.value) {
    items.push({ id: 'load-chat', label: 'Load Chat', icon: MessageSquare, badge: chatUnreadBadge.value || undefined });
  }
  if (canViewReportsTab.value) {
    items.push({ id: 'reports', label: 'Reports', icon: BarChart3 });
  }

  return items;
});

watch(navItems, (items) => {
  if (!items.some((item) => item.id === activeTab.value)) {
    activeTab.value = items[0]?.id ?? 'available';
  }
});

function showToast(message: string, type: ToastType): void {
  ui.showToast(message, type);
}

provide('showToast', showToast);

async function refreshData(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['initial-data'] });
}

async function run(task: () => Promise<void>, successMessage?: string): Promise<void> {
  busy.value = true;
  errorMsg.value = '';
  try {
    await task();
    if (successMessage) {
      ui.showToast(successMessage, 'success');
    }
    await refreshData();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    errorMsg.value = message;
    ui.showToast(message, 'error');
  } finally {
    busy.value = false;
  }
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }

  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoPrefix) {
    return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
  }

  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mmddyyyy) {
    return `${mmddyyyy[3]}-${mmddyyyy[1]!.padStart(2, '0')}-${mmddyyyy[2]!.padStart(2, '0')}`;
  }

  return '';
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!parsed) {
    return isoDate;
  }

  const utc = new Date(Date.UTC(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3])));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function resolveGreenbushOfferedPickupDate(greenbushId: string): string {
  const candidates = loads.value
    .filter((load) => load.greenbush_bank_id === greenbushId)
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));

  for (const load of candidates) {
    const candidate = toDateInputValue(load.pu_date ?? load.requested_pickup_date);
    if (candidate) {
      return candidate;
    }
  }

  return '';
}

function setQuoteNextDay(): void {
  const baseDate = quoteModal.basePickupDate;
  if (!baseDate) {
    ui.showToast('No offered PU date found on this load.', 'info');
    return;
  }

  quoteModal.pickupDate = addDaysToIsoDate(baseDate, 1);
}

function setGreenbushQuoteNextDay(): void {
  const baseDate = greenbushQuoteModal.basePickupDate;
  if (!baseDate) {
    ui.showToast('No offered PU date found for this Greenbush load.', 'info');
    return;
  }

  greenbushQuoteModal.pickupDate = addDaysToIsoDate(baseDate, 1);
}

function bookPrompt(loadId: string): void {
  bookModal.loadId = loadId;
  bookModal.truckNumber = '';
  bookModal.driverName = '';
  showBookModal.value = true;
}

function closeBookModal(): void {
  showBookModal.value = false;
  bookModal.loadId = '';
  bookModal.truckNumber = '';
  bookModal.driverName = '';
}

async function submitBookModal(): Promise<void> {
  const loadId = bookModal.loadId;
  const truckNumber = bookModal.truckNumber.trim();
  const driverName = bookModal.driverName.trim();

  if (!loadId || !truckNumber || !driverName) {
    ui.showToast('Truck number and driver name are required.', 'error');
    return;
  }

  await run(async () => {
    await bookLoad({ loadId, truckNumber, driverName });
  }, 'Booking submitted for review');

  closeBookModal();
}

function quotePrompt(loadId: string): void {
  const load = loads.value.find((entry) => entry.id === loadId);
  const offeredPickupDate = toDateInputValue(load?.pu_date ?? load?.requested_pickup_date);
  quoteModal.loadId = loadId;
  quoteModal.basePickupDate = offeredPickupDate;
  quoteModal.pickupDate = offeredPickupDate;
  showQuoteModal.value = true;
}

function closeQuoteModal(): void {
  showQuoteModal.value = false;
  quoteModal.loadId = '';
  quoteModal.basePickupDate = '';
  quoteModal.pickupDate = '';
}

async function submitQuoteModal(): Promise<void> {
  const loadId = quoteModal.loadId;
  const pickupDate = quoteModal.pickupDate.trim();

  if (!loadId || !pickupDate) {
    ui.showToast('Pickup date is required.', 'error');
    return;
  }

  await run(async () => {
    await quoteLoad({ loadId, pickupDate });
  }, 'Quote submitted');

  closeQuoteModal();
}

async function decisionAction(payload: {
  loadId: string;
  decision: 'accept' | 'deny';
  requestedPickupDate?: string;
  newDeliveryDate?: string;
  loadRefNumber?: string;
  mcleodOrderId?: string;
  denyReason?: string;
}): Promise<void> {
  await run(async () => {
    await decideLoad(payload);
  }, payload.decision === 'accept' ? 'Load accepted' : 'Load denied');
}

async function statusPrompt(payload: {
  loadId: string;
  status: 'LOADED' | 'DELIVERED' | 'DELAYED' | 'CANCELED' | 'TONU';
  reason?: string;
}): Promise<void> {
  await run(async () => {
    await updateLoadStatus(payload.loadId, payload.status, payload.reason);
  }, `Status updated to ${payload.status}`);
}

async function saveSpecsAction(payload: { loadId: string; notes: string }): Promise<void> {
  await run(async () => {
    await updateLoad(payload.loadId, {
      notes: payload.notes.trim() || null,
    });
  }, 'Specs updated');
}

function greenbushQuotePrompt(rowId: string): void {
  const offeredPickupDate = resolveGreenbushOfferedPickupDate(rowId);
  greenbushQuoteModal.greenbushId = rowId;
  greenbushQuoteModal.basePickupDate = offeredPickupDate;
  greenbushQuoteModal.pickupDate = offeredPickupDate;
  greenbushQuoteModal.truckNumber = '';
  greenbushQuoteModal.driverName = '';
  showGreenbushQuoteModal.value = true;
}

function closeGreenbushQuoteModal(): void {
  showGreenbushQuoteModal.value = false;
  greenbushQuoteModal.greenbushId = '';
  greenbushQuoteModal.basePickupDate = '';
  greenbushQuoteModal.pickupDate = '';
  greenbushQuoteModal.truckNumber = '';
  greenbushQuoteModal.driverName = '';
}

async function submitGreenbushQuoteModal(): Promise<void> {
  const greenbushId = greenbushQuoteModal.greenbushId;
  const pickupDate = greenbushQuoteModal.pickupDate.trim();
  const truckNumber = greenbushQuoteModal.truckNumber.trim();
  const driverName = greenbushQuoteModal.driverName.trim() || undefined;

  if (!greenbushId || !pickupDate || !truckNumber) {
    ui.showToast('Pickup date and truck number are required.', 'error');
    return;
  }

  await run(async () => {
    await quoteGreenbush({ greenbushId, pickupDate, truckNumber, driverName });
  }, 'Greenbush quote submitted');

  closeGreenbushQuoteModal();
}

async function createCustomerAction(payload: {
  name: string;
  type: 'Direct Customer' | 'Broker';
  quoteAccept: boolean;
}): Promise<void> {
  await run(async () => {
    await createCustomer(payload);
  }, 'Customer created');
}

async function updateCustomerAction(payload: {
  id: string;
  data: { name: string; type: 'Direct Customer' | 'Broker'; quoteAccept: boolean };
}): Promise<void> {
  await run(async () => {
    await updateCustomer(payload.id, payload.data);
  }, 'Customer updated');
}

async function deleteCustomerAction(id: string): Promise<void> {
  await run(async () => {
    await deleteCustomer(id);
  }, 'Customer deleted');
}

async function createUserAction(payload: {
  email: string;
  name: string;
  role: UserRecord['role'];
  fullLoadAccess?: boolean;
}): Promise<void> {
  await run(async () => {
    await createUser(payload);
  }, 'User created');
}

async function updateUserAction(payload: {
  id: string;
  data: { email: string; name: string; role: UserRecord['role']; fullLoadAccess?: boolean };
}): Promise<void> {
  await run(async () => {
    await updateUser(payload.id, payload.data);
  }, 'User updated');
}

async function deleteUserAction(id: string): Promise<void> {
  await run(async () => {
    await deleteUser(id);
  }, 'User deleted');
}

async function banUserAction(id: string): Promise<void> {
  await run(async () => {
    await banUser(id);
  }, 'User banned');
}

async function createGreenbushAction(payload: GreenbushMutationPayload): Promise<void> {
  await run(async () => {
    await createGreenbush(payload);
  }, 'Greenbush row created');
}

async function updateGreenbushAction(payload: { id: string; data: GreenbushMutationPayload }): Promise<void> {
  await run(async () => {
    await updateGreenbush(payload.id, payload.data);
  }, 'Greenbush row updated');
}

async function deleteGreenbushAction(id: string): Promise<void> {
  await run(async () => {
    await deleteGreenbush(id);
  }, 'Greenbush row deleted');
}

async function incrementGreenbushAction(id: string): Promise<void> {
  await run(async () => {
    await incrementGreenbush(id);
  }, 'Greenbush inventory increased');
}

async function bulkReplaceGreenbushAction(rows: GreenbushMutationPayload[]): Promise<void> {
  await run(async () => {
    await bulkReplaceGreenbush(rows);
  }, 'Greenbush pool replaced');
}

function roleLabel(value: string | undefined): string {
  if (!value) return 'Unknown Role';
  return value
    .split('_')
    .map((segment) => `${segment[0]}${segment.slice(1).toLowerCase()}`)
    .join(' ');
}

function toastClass(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-emerald-700';
    case 'error':
      return 'bg-rose-700';
    case 'warning':
      return 'bg-amber-600';
    default:
      return 'bg-blue-700';
  }
}

async function handleLogout(): Promise<void> {
  await auth.logoutSession();
  redirectToPortalLogin();
}

if (!auth.user) {
  void auth.refreshSession();
}
</script>
