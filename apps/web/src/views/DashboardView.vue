<template>
  <div class="min-h-screen px-4 py-4 md:px-6 md:py-6">
    <div class="mx-auto flex min-h-[92vh] max-w-[1600px] gap-4">
      <aside class="glass-panel rounded-3xl p-4" :class="ui.sidebarWidthClass">
        <div class="flex h-full flex-col">
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-2" :class="{ 'sr-only': ui.navCollapsed }">
              <img src="https://afctransport.com/wp-content/themes/AFC/img/logo.png" alt="AFC" class="brand-logo h-7 w-auto" />
              <h1 class="text-sm font-extrabold tracking-[0.16em] text-zinc-800 dark:text-zinc-100">AFC OPS</h1>
            </div>
            <button class="brand-button rounded-lg px-2 py-1 text-xs font-semibold" @click="ui.toggleNav">{{ ui.navCollapsed ? '>>' : '<<' }}</button>
          </div>
          <nav class="space-y-2">
            <button
              v-for="item in navItems"
              :key="item.id"
              class="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition"
              :class="activeTab === item.id ? 'bg-red-700 text-white dark:bg-red-600' : 'text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-800/70'"
              @click="activeTab = item.id"
            >
              <span class="flex items-center gap-2"><span>{{ item.icon }}</span><span v-if="!ui.navCollapsed">{{ item.label }}</span></span>
              <span v-if="item.badge && !ui.navCollapsed" class="rounded-full bg-white/20 px-2 py-0.5 text-xs">{{ item.badge }}</span>
            </button>
          </nav>
          <div class="mt-auto space-y-2">
            <button class="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-200/80 dark:text-zinc-200 dark:hover:bg-zinc-800/70" @click="ui.toggleTheme">
              <span>DM</span><span v-if="!ui.navCollapsed">{{ ui.darkMode ? 'Light' : 'Dark' }} Mode</span>
            </button>
            <button class="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/30" @click="handleLogout">
              <span>LO</span><span v-if="!ui.navCollapsed">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main class="flex-1">
        <header class="glass-panel rounded-3xl px-6 py-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-300">AFC Transport Operations Dashboard</p>
              <h2 class="text-2xl font-extrabold">Welcome, {{ currentUser?.name }}</h2>
            </div>
            <div class="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{{ roleLabel(currentUser?.role) }}</div>
          </div>
        </header>

        <section v-if="canCreateLoad" class="mt-4 glass-panel rounded-3xl p-5">
          <h3 class="text-lg font-bold">New Load</h3>
          <form class="mt-3 grid gap-3 md:grid-cols-4" @submit.prevent="submitQuickLoad">
            <select v-model="quickLoadForm.customerId" required class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70">
              <option value="" disabled>Select customer</option>
              <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
            </select>
            <input v-model="quickLoadForm.loadRefNumber" required placeholder="Load Ref #" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model="quickLoadForm.puCity" required placeholder="PU City" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model="quickLoadForm.puState" required maxlength="2" placeholder="PU ST" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model="quickLoadForm.delCity" required placeholder="DEL City" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model="quickLoadForm.delState" required maxlength="2" placeholder="DEL ST" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model.number="quickLoadForm.rate" required type="number" min="0" step="0.01" placeholder="Rate" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
            <input v-model.number="quickLoadForm.miles" required type="number" min="1" step="0.01" placeholder="Miles" class="rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
            <button type="submit" class="brand-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60" :disabled="busy">{{ busy ? 'Saving...' : 'Create Load' }}</button>
          </form>
        </section>

        <section class="mt-4 glass-panel rounded-3xl p-5">
          <div v-if="query.isLoading.value" class="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">Loading...</div>
          <div v-else-if="query.isError.value" class="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{{ (query.error.value as Error).message }}</div>
          <template v-else>
            <div v-if="errorMsg" class="mb-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{{ errorMsg }}</div>
            <AvailableLoadsTab v-if="activeTab === 'available'" :loads="loads" :can-book="canBook" :can-quote="canQuoteLoads" @book="bookPrompt" @quote="quotePrompt" />
            <MyLoadsTab v-else-if="activeTab === 'my-loads'" :loads="loads" :user="currentUser" :can-decide="canDecide" :can-update-status="canBook" @open-decision="decisionPrompt" @set-status="statusPrompt" />
            <AllLoadsTab v-else-if="activeTab === 'all-loads'" :loads="loads" :customers="customers" :users="users" :can-edit="canEditLoads" @edit="editLoadPrompt" />
            <CustomersTab v-else-if="activeTab === 'customers'" :customers="customers" :can-manage="canManageCustomers" @create="createCustomerAction" @update="updateCustomerAction" @delete="deleteCustomerAction" />
            <UsersTab v-else-if="activeTab === 'users'" :users="users" :can-manage="canManageUsers" :current-user-id="currentUser?.sub ?? ''" @create="createUserAction" @update="updateUserAction" @delete="deleteUserAction" @ban="banUserAction" />
            <GreenbushTab v-else-if="activeTab === 'greenbush'" :rows="greenbush" :can-manage="canManageGreenbush" :can-quote="canBook" @open-quote="greenbushQuotePrompt" @create="createGreenbushAction" @update="updateGreenbushAction" @increment="incrementGreenbushAction" @bulk-replace="bulkReplaceGreenbushAction" />
            <ReportsTab v-else />
          </template>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  banUser, bookLoad, bulkReplaceGreenbush, createCustomer, createGreenbush, createLoad, createUser, decideLoad,
  deleteCustomer, deleteUser, getInitialData, incrementGreenbush, quoteGreenbush, quoteLoad, updateCustomer, updateGreenbush,
  updateLoad, updateLoadStatus, updateUser, type GreenbushMutationPayload,
} from '@/api/freight';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type { LoadRecord, SessionUser, UserRecord } from '@/types/models';
import AllLoadsTab from './dashboard/AllLoadsTab.vue';
import AvailableLoadsTab from './dashboard/AvailableLoadsTab.vue';
import CustomersTab from './dashboard/CustomersTab.vue';
import GreenbushTab from './dashboard/GreenbushTab.vue';
import MyLoadsTab from './dashboard/MyLoadsTab.vue';
import ReportsTab from './dashboard/ReportsTab.vue';
import UsersTab from './dashboard/UsersTab.vue';

type TabId = 'available' | 'my-loads' | 'all-loads' | 'customers' | 'users' | 'greenbush' | 'reports';
const router = useRouter(); const queryClient = useQueryClient(); const auth = useAuthStore(); const ui = useUiStore();
const activeTab = ref<TabId>('available'); const busy = ref(false); const errorMsg = ref('');
const query = useQuery({ queryKey: ['initial-data'], queryFn: () => getInitialData(), refetchInterval: 10000 });
watch(() => query.data.value?.currentUser, (v) => { if (v) auth.user = v; }, { immediate: true });
const currentUser = computed<SessionUser | null>(() => query.data.value?.currentUser ?? auth.user);
const loads = computed(() => query.data.value?.loads ?? []); const customers = computed(() => query.data.value?.customers ?? []);
const users = computed<UserRecord[]>(() => query.data.value?.users ?? []); const greenbush = computed(() => query.data.value?.greenbush ?? []);
const role = computed(() => currentUser.value?.role ?? 'VIEWER');
const canCreateLoad = computed(() => ['ACCOUNT_MANAGER', 'MANAGER', 'ADMIN'].includes(role.value));
const canBook = computed(() => ['DISPATCHER', 'MANAGER', 'ADMIN'].includes(role.value));
const canQuoteLoads = computed(() => canBook.value); const canDecide = computed(() => ['MANAGER', 'ADMIN'].includes(role.value));
const canEditLoads = computed(() => ['ACCOUNT_MANAGER', 'MANAGER', 'ADMIN'].includes(role.value));
const canManageCustomers = computed(() => ['ACCOUNT_MANAGER', 'MANAGER', 'ADMIN'].includes(role.value));
const canManageUsers = computed(() => ['MANAGER', 'ADMIN'].includes(role.value));
const canManageGreenbush = computed(() => ['MANAGER', 'ADMIN'].includes(role.value));
const pendingBadge = computed(() => loads.value.filter((l) => l.status === 'PENDING_APPROVAL' || l.status === 'QUOTE_SUBMITTED').length);
const navItems = computed(() => {
  const items: Array<{ id: TabId; label: string; icon: string; badge?: number }> = [
    { id: 'available', label: 'Available', icon: 'AV' }, { id: 'my-loads', label: 'My Loads', icon: 'MY', badge: pendingBadge.value },
    { id: 'all-loads', label: 'All Loads', icon: 'AL' }, { id: 'customers', label: 'Customers', icon: 'CU' },
    { id: 'greenbush', label: 'Greenbush', icon: 'GB' }, { id: 'reports', label: 'Reports', icon: 'RP' },
  ]; if (canManageUsers.value) items.splice(4, 0, { id: 'users', label: 'Users', icon: 'US' }); return items;
});
watch(navItems, (items) => { if (!items.some((i) => i.id === activeTab.value)) activeTab.value = items[0]?.id ?? 'available'; });
const quickLoadForm = reactive({ customerId: '', loadRefNumber: '', puCity: '', puState: '', delCity: '', delState: '', rate: 0, miles: 0 });
async function run(task: () => Promise<void>): Promise<void> { busy.value = true; errorMsg.value = ''; try { await task(); await queryClient.invalidateQueries({ queryKey: ['initial-data'] }); } catch (e) { errorMsg.value = e instanceof Error ? e.message : 'Unexpected error'; } finally { busy.value = false; } }
async function submitQuickLoad(): Promise<void> { if (!canCreateLoad.value) return; await run(async () => { await createLoad({ customerId: quickLoadForm.customerId, loadRefNumber: quickLoadForm.loadRefNumber.trim(), puCity: quickLoadForm.puCity.trim(), puState: quickLoadForm.puState.trim().toUpperCase(), delCity: quickLoadForm.delCity.trim(), delState: quickLoadForm.delState.trim().toUpperCase(), rate: Number(quickLoadForm.rate), miles: Number(quickLoadForm.miles) }); quickLoadForm.customerId = ''; quickLoadForm.loadRefNumber = ''; quickLoadForm.puCity = ''; quickLoadForm.puState = ''; quickLoadForm.delCity = ''; quickLoadForm.delState = ''; quickLoadForm.rate = 0; quickLoadForm.miles = 0; }); }
async function bookPrompt(loadId: string): Promise<void> { const truckNumber = window.prompt('Truck number?'); if (!truckNumber) return; const driverName = window.prompt('Driver name?'); if (!driverName) return; await run(async () => { await bookLoad({ loadId, truckNumber, driverName }); }); }
async function quotePrompt(loadId: string): Promise<void> { const pickupDate = window.prompt('Requested pickup date (YYYY-MM-DD)?', new Date().toISOString().slice(0, 10)); if (!pickupDate) return; await run(async () => { await quoteLoad({ loadId, pickupDate }); }); }
async function decisionPrompt(loadId: string, decision: 'accept' | 'deny'): Promise<void> {
  const load = loads.value.find((row) => row.id === loadId); if (!load) return;
  const notes = window.prompt('Decision notes?', decision === 'accept' ? 'Approved' : 'Denied') ?? undefined;
  const requestedPickupDate = window.prompt('Requested pickup date (optional)', load.requested_pickup_date ?? load.pu_date ?? '') || undefined;
  const newDeliveryDate = decision === 'accept' && load.status === 'QUOTE_SUBMITTED' ? (window.prompt('New delivery date (required for quote accept)', load.del_date ?? '') || undefined) : undefined;
  const loadRefNumber = window.prompt('Load Ref # (optional)', load.load_ref_number) || undefined;
  const mcleodOrderId = window.prompt('McLeod Order ID (optional)', load.mcleod_order_id ?? '') || undefined;
  await run(async () => { await decideLoad({ loadId, decision, notes, requestedPickupDate, newDeliveryDate, loadRefNumber, mcleodOrderId }); });
}
async function statusPrompt(loadId: string, status: 'LOADED' | 'DELIVERED' | 'DELAYED' | 'CANCELED'): Promise<void> {
  const reason = status === 'DELAYED' || status === 'CANCELED' ? (window.prompt(`${status} reason`) || undefined) : undefined;
  await run(async () => { await updateLoadStatus(loadId, status, reason); });
}
async function editLoadPrompt(loadId: string): Promise<void> {
  const load = loads.value.find((row) => row.id === loadId); if (!load) return;
  const payloadText = window.prompt('Edit JSON payload for PATCH /loads/:id', JSON.stringify({ customerId: load.customer_id, accountManagerId: load.account_manager_id, assignedDispatcherId: load.assigned_dispatcher_id, status: load.status, loadRefNumber: load.load_ref_number, mcleodOrderId: load.mcleod_order_id, requestedPickupDate: load.requested_pickup_date, puDate: load.pu_date, delDate: load.del_date, rate: Number(load.rate), miles: Number(load.miles), truckNumber: load.truck_number, driverName: load.driver_name, equipment: load.equipment, notes: load.notes, otherNotes: load.other_notes }, null, 2));
  if (!payloadText) return; let payload: unknown; try { payload = JSON.parse(payloadText); } catch { window.alert('Invalid JSON payload'); return; }
  await run(async () => { await updateLoad(loadId, payload as Record<string, unknown>); });
}
async function greenbushQuotePrompt(rowId: string): Promise<void> { const pickupDate = window.prompt('Pickup date (YYYY-MM-DD)?', new Date().toISOString().slice(0, 10)); if (!pickupDate) return; const truckNumber = window.prompt('Truck number?'); if (!truckNumber) return; const driverName = window.prompt('Driver name (optional)') || undefined; await run(async () => { await quoteGreenbush({ greenbushId: rowId, pickupDate, truckNumber, driverName }); }); }
async function createCustomerAction(payload: { name: string; type: 'Direct Customer' | 'Broker'; quoteAccept: boolean }): Promise<void> { await run(async () => { await createCustomer(payload); }); }
async function updateCustomerAction(payload: { id: string; data: { name: string; type: 'Direct Customer' | 'Broker'; quoteAccept: boolean } }): Promise<void> { await run(async () => { await updateCustomer(payload.id, payload.data); }); }
async function deleteCustomerAction(id: string): Promise<void> { await run(async () => { await deleteCustomer(id); }); }
async function createUserAction(payload: { email: string; name: string; role: UserRecord['role'] }): Promise<void> { await run(async () => { await createUser(payload); }); }
async function updateUserAction(payload: { id: string; data: { email: string; name: string; role: UserRecord['role'] } }): Promise<void> { await run(async () => { await updateUser(payload.id, payload.data); }); }
async function deleteUserAction(id: string): Promise<void> { await run(async () => { await deleteUser(id); }); }
async function banUserAction(id: string): Promise<void> { await run(async () => { await banUser(id); }); }
async function createGreenbushAction(payload: GreenbushMutationPayload): Promise<void> { await run(async () => { await createGreenbush(payload); }); }
async function updateGreenbushAction(payload: { id: string; data: GreenbushMutationPayload }): Promise<void> { await run(async () => { await updateGreenbush(payload.id, payload.data); }); }
async function incrementGreenbushAction(id: string): Promise<void> { await run(async () => { await incrementGreenbush(id); }); }
async function bulkReplaceGreenbushAction(rows: GreenbushMutationPayload[]): Promise<void> { await run(async () => { await bulkReplaceGreenbush(rows); }); }
function roleLabel(value: string | undefined): string { if (!value) return 'Unknown Role'; return value.split('_').map((s) => `${s[0]}${s.slice(1).toLowerCase()}`).join(' '); }
async function handleLogout(): Promise<void> { await auth.logoutSession(); await router.push({ name: 'login' }); }
if (!auth.user) void auth.refreshSession();
</script>
