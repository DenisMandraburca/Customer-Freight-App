<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">All Loads</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ filteredLoads.length }} shown</p>
    </header>

    <div class="grid gap-3 rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60 md:grid-cols-3 xl:grid-cols-6">
      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Search
        <input
          v-model="filters.search"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          placeholder="Ref, route, customer"
        />
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Customer
        <select
          v-model="filters.customerId"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option value="">All</option>
          <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
        </select>
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Dispatcher
        <select
          v-model="filters.dispatcherId"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option value="">All</option>
          <option v-for="user in dispatchers" :key="user.id" :value="user.id">{{ user.name }}</option>
        </select>
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Account Manager
        <select
          v-model="filters.accountManagerId"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option value="">All</option>
          <option v-for="user in accountManagers" :key="user.id" :value="user.id">{{ user.name }}</option>
        </select>
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Status
        <select
          v-model="filters.status"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option value="">All</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
        </select>
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Date Field
        <select
          v-model="filters.dateField"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option value="pu_date">Pickup Date</option>
          <option value="del_date">Delivery Date</option>
        </select>
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        From
        <input
          v-model="filters.from"
          type="date"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        />
      </label>

      <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        To
        <input
          v-model="filters.to"
          type="date"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        />
      </label>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-zinc-300/70 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/60">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-200/70 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          <tr>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('created_at')">Created</button>
            </th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('load_ref_number')">Ref</button>
            </th>
            <th class="px-3 py-3 text-left">Route</th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('customer_name')">Customer</button>
            </th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('status')">Status</button>
            </th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('pu_date')">PU</button>
            </th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('del_date')">DEL</button>
            </th>
            <th class="px-3 py-3 text-left">
              <button type="button" class="font-semibold" @click="toggleSort('rate')">Rate</button>
            </th>
            <th class="px-3 py-3 text-left">Dispatcher</th>
            <th class="px-3 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="load in filteredLoads" :key="load.id" class="border-t border-zinc-200/70 dark:border-zinc-800">
            <td class="px-3 py-2">{{ dateOnly(load.created_at) }}</td>
            <td class="px-3 py-2 font-semibold">{{ load.load_ref_number }}</td>
            <td class="px-3 py-2">{{ load.pu_city }}, {{ load.pu_state }} -> {{ load.del_city }}, {{ load.del_state }}</td>
            <td class="px-3 py-2">{{ load.customer_name ?? 'N/A' }}</td>
            <td class="px-3 py-2">{{ statusLabel(load.status) }}</td>
            <td class="px-3 py-2">{{ load.pu_date ?? '-' }}</td>
            <td class="px-3 py-2">{{ load.del_date ?? '-' }}</td>
            <td class="px-3 py-2">${{ numberFormat(load.rate) }}</td>
            <td class="px-3 py-2">{{ load.dispatcher_name ?? '-' }}</td>
            <td class="px-3 py-2">
              <button
                v-if="canEdit"
                type="button"
                class="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                @click="emit('edit', load.id)"
              >
                Edit
              </button>
            </td>
          </tr>
          <tr v-if="filteredLoads.length === 0">
            <td colspan="10" class="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">No loads match current filters.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { LOAD_STATUSES, toLoadStatusLabel } from '@antigravity/shared';

import type { CustomerRecord, LoadRecord, UserRecord } from '@/types/models';

type SortKey = 'created_at' | 'load_ref_number' | 'customer_name' | 'status' | 'pu_date' | 'del_date' | 'rate';

const props = defineProps<{
  loads: LoadRecord[];
  customers: CustomerRecord[];
  users: UserRecord[];
  canEdit: boolean;
}>();

const emit = defineEmits<{
  edit: [loadId: string];
}>();

const filters = reactive({
  search: '',
  customerId: '',
  dispatcherId: '',
  accountManagerId: '',
  status: '' as '' | LoadRecord['status'],
  dateField: 'pu_date' as 'pu_date' | 'del_date',
  from: '',
  to: '',
});

const sortKey = ref<SortKey>('created_at');
const sortDirection = ref<'asc' | 'desc'>('desc');

const statuses = LOAD_STATUSES;

const dispatchers = computed(() => props.users.filter((user) => user.role === 'DISPATCHER'));
const accountManagers = computed(() => props.users.filter((user) => user.role === 'ACCOUNT_MANAGER'));

const filteredLoads = computed(() => {
  const search = filters.search.trim().toLowerCase();

  return [...props.loads]
    .filter((load) => {
      if (filters.customerId && load.customer_id !== filters.customerId) return false;
      if (filters.dispatcherId && load.assigned_dispatcher_id !== filters.dispatcherId) return false;
      if (filters.accountManagerId && load.account_manager_id !== filters.accountManagerId) return false;
      if (filters.status && load.status !== filters.status) return false;

      const dateValue = load[filters.dateField];
      if (filters.from && (!dateValue || dateValue < filters.from)) return false;
      if (filters.to && (!dateValue || dateValue > filters.to)) return false;

      if (!search) return true;

      const haystack = [
        load.load_ref_number,
        load.pu_city,
        load.pu_state,
        load.del_city,
        load.del_state,
        load.customer_name ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    })
    .sort((a, b) => {
      const left = valueForSort(a, sortKey.value);
      const right = valueForSort(b, sortKey.value);

      if (left < right) return sortDirection.value === 'asc' ? -1 : 1;
      if (left > right) return sortDirection.value === 'asc' ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
});

function toggleSort(next: SortKey): void {
  if (sortKey.value === next) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }

  sortKey.value = next;
  sortDirection.value = next === 'created_at' ? 'desc' : 'asc';
}

function valueForSort(load: LoadRecord, key: SortKey): string | number {
  switch (key) {
    case 'created_at':
      return load.created_at;
    case 'load_ref_number':
      return load.load_ref_number.toLowerCase();
    case 'customer_name':
      return (load.customer_name ?? '').toLowerCase();
    case 'status':
      return load.status;
    case 'pu_date':
      return load.pu_date ?? '';
    case 'del_date':
      return load.del_date ?? '';
    case 'rate':
      return Number(load.rate);
    default:
      return '';
  }
}

function numberFormat(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function statusLabel(status: LoadRecord['status']): string {
  return toLoadStatusLabel(status);
}
</script>
