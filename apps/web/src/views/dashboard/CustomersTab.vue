<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">Customers</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ filteredCustomers.length }} shown</p>
    </header>

    <label class="block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
      Search
      <input
        v-model="search"
        class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        placeholder="Customer name"
      />
    </label>

    <div class="overflow-x-auto rounded-2xl border border-zinc-300/70 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/60">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-200/70 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          <tr>
            <th class="px-3 py-3 text-left">Name</th>
            <th class="px-3 py-3 text-left">Type</th>
            <th class="px-3 py-3 text-left">Quote</th>
            <th class="px-3 py-3 text-left">Delivered</th>
            <th class="px-3 py-3 text-left">Delivered Rate</th>
            <th class="px-3 py-3 text-left">Canceled</th>
            <th class="px-3 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in filteredCustomers" :key="customer.id" class="border-t border-zinc-200/70 dark:border-zinc-800">
            <td class="px-3 py-2 font-semibold">{{ customer.name }}</td>
            <td class="px-3 py-2">{{ customer.type }}</td>
            <td class="px-3 py-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="customer.quote_accept ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'"
              >
                {{ customer.quote_accept ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
            <td class="px-3 py-2">{{ customer.total_delivered ?? 0 }}</td>
            <td class="px-3 py-2">${{ numberFormat(customer.total_rate_delivered ?? '0') }}</td>
            <td class="px-3 py-2">{{ customer.total_canceled ?? 0 }}</td>
            <td class="px-3 py-2">
              <div v-if="canManage" class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  @click="startEdit(customer)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                  @click="emit('delete', customer.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredCustomers.length === 0">
            <td colspan="7" class="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">No customers match current search.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <article
      v-if="canManage"
      class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
    >
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {{ editingId ? 'Edit Customer' : 'Create Customer' }}
      </h4>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300 md:col-span-2">
          Name
          <input
            v-model="form.name"
            class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Type
          <select
            v-model="form.type"
            class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          >
            <option value="Direct Customer">Direct Customer</option>
            <option value="Broker">Broker</option>
          </select>
        </label>
      </div>
      <label class="mt-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
        <input v-model="form.quoteAccept" type="checkbox" />
        Quote Accepted
      </label>
      <p v-if="hasDuplicateName" class="mt-2 text-xs text-rose-600 dark:text-rose-400">A customer with this name already exists.</p>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="brand-button rounded-lg px-3 py-2 text-xs font-semibold"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ editingId ? 'Update Customer' : 'Create Customer' }}
        </button>
        <button
          v-if="editingId"
          type="button"
          class="rounded-lg bg-zinc-200 px-3 py-2 text-xs font-semibold dark:bg-zinc-700"
          @click="resetForm"
        >
          Cancel
        </button>
      </div>
    </article>
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
const editingId = ref('');

const form = reactive({
  name: '',
  type: 'Direct Customer' as 'Direct Customer' | 'Broker',
  quoteAccept: false,
});

const filteredCustomers = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return props.customers;
  }

  return props.customers.filter((customer) => customer.name.toLowerCase().includes(term));
});

const hasDuplicateName = computed(() => {
  const normalized = form.name.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return props.customers.some((customer) => {
    if (editingId.value && customer.id === editingId.value) {
      return false;
    }
    return customer.name.trim().toLowerCase() === normalized;
  });
});

const canSubmit = computed(() => form.name.trim().length > 0 && !hasDuplicateName.value);

function submit(): void {
  if (!canSubmit.value) {
    return;
  }

  const payload = {
    name: form.name.trim(),
    type: form.type,
    quoteAccept: form.quoteAccept,
  };

  if (editingId.value) {
    emit('update', { id: editingId.value, data: payload });
  } else {
    emit('create', payload);
  }
  resetForm();
}

function startEdit(customer: CustomerRecord): void {
  editingId.value = customer.id;
  form.name = customer.name;
  form.type = customer.type;
  form.quoteAccept = customer.quote_accept;
}

function resetForm(): void {
  editingId.value = '';
  form.name = '';
  form.type = 'Direct Customer';
  form.quoteAccept = false;
}

function numberFormat(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}
</script>
