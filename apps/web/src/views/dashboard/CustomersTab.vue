<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">Customers</h3>
      <p class="text-xs text-zinc-700">{{ sortedCustomers.length }} shown</p>
    </header>

    <div class="mb-4 flex flex-col gap-4 lg:flex-row">
      <div class="w-full glass-panel rounded-xl p-4 space-y-3 lg:w-[30%]">
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">Search</h3>
        <input
          v-model="search"
          type="text"
          placeholder="Search by name..."
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          v-model="typeFilter"
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All Types</option>
          <option value="Direct Customer">Direct Customer</option>
          <option value="Broker">Broker</option>
        </select>
      </div>

      <div v-if="canManage" class="flex-1 glass-panel rounded-xl p-4">
        <h3 class="mb-3 text-xs font-black uppercase tracking-widest text-zinc-700">
          {{ editingCustomer ? 'Edit Customer' : 'Add Customer' }}
        </h3>
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-3" @submit.prevent="saveCustomer">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Customer Name
            <input
              v-model="form.name"
              required
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Type
            <select
              v-model="form.type"
              required
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="Direct Customer">Direct Customer</option>
              <option value="Broker">Broker</option>
            </select>
          </label>
          <label class="flex items-center gap-2 pt-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <input v-model="form.quoteAccept" type="checkbox" />
            Allow PU Date Quotes
          </label>
          <div class="col-span-full flex gap-2">
            <button
              type="submit"
              class="rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              {{ editingCustomer ? 'Save Changes' : 'Add Customer' }}
            </button>
            <button
              v-if="editingCustomer"
              type="button"
              class="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
            <tr>
              <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('customer')">
                Customer
                <span v-if="sortState.column === 'customer'" class="ml-1 text-[10px]">{{ sortState.dir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('type')">
                Type
                <span v-if="sortState.column === 'type'" class="ml-1 text-[10px]">{{ sortState.dir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('total_delivered')">
                Total Delivered
                <span v-if="sortState.column === 'total_delivered'" class="ml-1 text-[10px]">{{ sortState.dir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('total_rate_delivered')">
                Total Rate
                <span v-if="sortState.column === 'total_rate_delivered'" class="ml-1 text-[10px]">{{ sortState.dir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort('total_canceled')">
                Loads Canceled
                <span v-if="sortState.column === 'total_canceled'" class="ml-1 text-[10px]">{{ sortState.dir === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr v-for="customer in sortedCustomers" :key="customer.id">
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">{{ customer.name }}</span>
                  <span :class="customer.quote_accept ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'" class="rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {{ customer.quote_accept ? 'Quote ?' : 'No Quote' }}
                  </span>
                  <span v-if="isDuplicate(customer.name)" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Duplicate</span>
                </div>
              </td>
              <td class="px-3 py-2">{{ customer.type }}</td>
              <td class="px-3 py-2">{{ customer.total_delivered ?? 0 }}</td>
              <td class="px-3 py-2">${{ money(customer.total_rate_delivered ?? '0') }}</td>
              <td class="px-3 py-2">
                {{ customer.total_canceled ?? 0 }}
                <span :class="['ml-1', canceledRatioClass(customer)]">({{ canceledRatio(customer) }})</span>
              </td>
              <td class="px-3 py-2 text-right">
                <div v-if="canManage" class="inline-flex gap-1">
                  <button type="button" class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" @click="startEdit(customer)">Edit</button>
                  <button type="button" class="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white" @click="emit('delete', customer.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="sortedCustomers.length === 0">
              <td colspan="6" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { CustomerRecord } from '@/types/models';

const props = defineProps<{
  customers: CustomerRecord[];
  canManage: boolean;
}>();

const emit = defineEmits<{
  create: [payload: { name: string; type: 'Direct Customer' | 'Broker'; quoteAccept: boolean }];
  update: [payload: { id: string; data: { name: string; type: 'Direct Customer' | 'Broker'; quoteAccept: boolean } }];
  delete: [customerId: string];
}>();

const search = ref('');
const typeFilter = ref('');
const editingCustomer = ref<CustomerRecord | null>(null);
const sortState = ref<{ column: 'customer' | 'type' | 'total_delivered' | 'total_rate_delivered' | 'total_canceled'; dir: 'asc' | 'desc' }>({
  column: 'total_delivered',
  dir: 'desc',
});

const form = reactive({
  name: '',
  type: 'Direct Customer' as 'Direct Customer' | 'Broker',
  quoteAccept: false,
});

const nameCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const customer of props.customers) {
    const key = customer.name.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
});

const filteredCustomers = computed(() => {
  const term = search.value.trim().toLowerCase();
  return props.customers.filter((customer) => {
    if (typeFilter.value && customer.type !== typeFilter.value) return false;
    if (!term) return true;
    return `${customer.name} ${customer.type}`.toLowerCase().includes(term);
  });
});

const sortedCustomers = computed(() =>
  [...filteredCustomers.value].sort((left, right) => {
    const cmp = compareCustomers(left, right, sortState.value.column);
    if (cmp !== 0) {
      return sortState.value.dir === 'asc' ? cmp : -cmp;
    }
    const nameCmp = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    if (nameCmp !== 0) {
      return nameCmp;
    }
    return left.id.localeCompare(right.id);
  }),
);

function isDuplicate(name: string): boolean {
  return (nameCounts.value.get(name.trim().toLowerCase()) ?? 0) > 1;
}

function cycleSort(column: 'customer' | 'type' | 'total_delivered' | 'total_rate_delivered' | 'total_canceled'): void {
  if (sortState.value.column !== column) {
    sortState.value = { column, dir: 'asc' };
    return;
  }

  sortState.value = {
    column,
    dir: sortState.value.dir === 'asc' ? 'desc' : 'asc',
  };
}

function compareCustomers(
  left: CustomerRecord,
  right: CustomerRecord,
  column: 'customer' | 'type' | 'total_delivered' | 'total_rate_delivered' | 'total_canceled',
): number {
  if (column === 'customer') {
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  }

  if (column === 'type') {
    return left.type.localeCompare(right.type, undefined, { sensitivity: 'base' });
  }

  if (column === 'total_rate_delivered') {
    return asNumber(left.total_rate_delivered) - asNumber(right.total_rate_delivered);
  }

  if (column === 'total_canceled') {
    return asNumber(left.total_canceled) - asNumber(right.total_canceled);
  }

  return asNumber(left.total_delivered) - asNumber(right.total_delivered);
}

function saveCustomer(): void {
  const payload = {
    name: form.name.trim(),
    type: form.type,
    quoteAccept: form.quoteAccept,
  };

  if (!payload.name) {
    return;
  }

  if (editingCustomer.value) {
    emit('update', { id: editingCustomer.value.id, data: payload });
  } else {
    emit('create', payload);
  }

  cancelEdit();
}

function startEdit(customer: CustomerRecord): void {
  editingCustomer.value = customer;
  form.name = customer.name;
  form.type = customer.type;
  form.quoteAccept = Boolean(customer.quote_accept);
}

function cancelEdit(): void {
  editingCustomer.value = null;
  form.name = '';
  form.type = 'Direct Customer';
  form.quoteAccept = false;
}

function money(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function asNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function canceledRatio(customer: CustomerRecord): string {
  const ratio = canceledRatioPercent(customer);
  return `${ratio.toFixed(2)}%`;
}

function canceledRatioPercent(customer: CustomerRecord): number {
  const canceled = asNumber(customer.total_canceled);
  const delivered = asNumber(customer.total_delivered);
  const total = delivered + canceled;
  if (total <= 0) {
    return 0;
  }
  return (canceled / total) * 100;
}

function canceledRatioClass(customer: CustomerRecord): string {
  return canceledRatioPercent(customer) > 25
    ? 'font-bold text-red-600 dark:text-red-400'
    : 'text-zinc-700 dark:text-zinc-300';
}
</script>
