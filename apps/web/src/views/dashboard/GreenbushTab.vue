<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">Greenbush Bank</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ rows.length }} rows</p>
    </header>

    <div class="overflow-x-auto rounded-2xl border border-zinc-300/70 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/60">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-200/70 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          <tr>
            <th class="px-3 py-3 text-left">Route</th>
            <th class="px-3 py-3 text-left">Receiving</th>
            <th class="px-3 py-3 text-left">Price</th>
            <th class="px-3 py-3 text-left">Remaining</th>
            <th class="px-3 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-t border-zinc-200/70 dark:border-zinc-800">
            <td class="px-3 py-2 font-semibold">{{ row.pickup_location }} -> {{ row.destination }}</td>
            <td class="px-3 py-2">{{ row.receiving_hours ?? '-' }}</td>
            <td class="px-3 py-2">${{ numberFormat(row.price) }}</td>
            <td class="px-3 py-2">{{ row.remaining_count }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="canQuote && row.remaining_count > 0"
                  type="button"
                  class="brand-button rounded-lg px-2 py-1 text-xs font-semibold"
                  @click="emit('open-quote', row.id)"
                >
                  Quote
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  @click="startEdit(row)"
                >
                  Edit
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white"
                  @click="emit('increment', row.id)"
                >
                  +1
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <article
      v-if="canManage"
      class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
    >
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {{ editingId ? 'Edit Greenbush Row' : 'Manual Add' }}
      </h4>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Pickup Location
          <input v-model="form.pickupLocation" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Destination
          <input v-model="form.destination" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Receiving Hours
          <input v-model="form.receivingHours" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Tarp
          <input v-model="form.tarp" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Price
          <input v-model.number="form.price" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Remaining Count
          <input v-model.number="form.remainingCount" type="number" min="0" step="1" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
        </label>
      </div>
      <label class="mt-3 block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Special Notes
        <input v-model="form.specialNotes" class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70" />
      </label>
      <div class="mt-3 flex gap-2">
        <button type="button" class="brand-button rounded-lg px-3 py-2 text-xs font-semibold" @click="submitRow">
          {{ editingId ? 'Update Row' : 'Add Row' }}
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

    <article
      v-if="canManage"
      class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
    >
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Bulk Replace</h4>
      <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
        Paste CSV rows: pickupLocation,destination,receivingHours,price,tarp,remainingCount,specialNotes
      </p>
      <textarea
        v-model="bulkInput"
        rows="5"
        class="mt-2 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
      ></textarea>
      <p v-if="bulkPreview.errors.length" class="mt-2 text-xs text-rose-600 dark:text-rose-400">
        {{ bulkPreview.errors[0] }}
      </p>
      <p class="mt-2 text-xs text-zinc-600 dark:text-zinc-300">Preview rows: {{ bulkPreview.rows.length }}</p>
      <button
        type="button"
        class="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
        :disabled="bulkPreview.rows.length === 0 || bulkPreview.errors.length > 0"
        @click="emit('bulk-replace', bulkPreview.rows)"
      >
        Replace All Rows
      </button>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { GreenbushMutationPayload } from '@/api/freight';
import type { GreenbushRecord } from '@/types/models';

const props = defineProps<{
  rows: GreenbushRecord[];
  canManage: boolean;
  canQuote: boolean;
}>();

const emit = defineEmits<{
  'open-quote': [rowId: string];
  create: [payload: GreenbushMutationPayload];
  update: [payload: { id: string; data: GreenbushMutationPayload }];
  increment: [rowId: string];
  'bulk-replace': [rows: GreenbushMutationPayload[]];
}>();

const editingId = ref('');
const bulkInput = ref('');

const form = reactive<GreenbushMutationPayload>({
  pickupLocation: '',
  destination: '',
  receivingHours: '',
  price: 0,
  tarp: '',
  remainingCount: 0,
  specialNotes: '',
});

const bulkPreview = computed(() => parseBulkRows(bulkInput.value));

function submitRow(): void {
  const payload: GreenbushMutationPayload = {
    pickupLocation: form.pickupLocation.trim(),
    destination: form.destination.trim(),
    receivingHours: form.receivingHours?.trim() || undefined,
    price: Number(form.price),
    tarp: form.tarp?.trim() || undefined,
    remainingCount: Math.max(0, Math.trunc(Number(form.remainingCount))),
    specialNotes: form.specialNotes?.trim() || undefined,
  };

  if (!payload.pickupLocation || !payload.destination) {
    return;
  }

  if (editingId.value) {
    emit('update', { id: editingId.value, data: payload });
  } else {
    emit('create', payload);
  }

  resetForm();
}

function startEdit(row: GreenbushRecord): void {
  editingId.value = row.id;
  form.pickupLocation = row.pickup_location;
  form.destination = row.destination;
  form.receivingHours = row.receiving_hours ?? '';
  form.price = Number(row.price);
  form.tarp = row.tarp ?? '';
  form.remainingCount = row.remaining_count;
  form.specialNotes = row.special_notes ?? '';
}

function resetForm(): void {
  editingId.value = '';
  form.pickupLocation = '';
  form.destination = '';
  form.receivingHours = '';
  form.price = 0;
  form.tarp = '';
  form.remainingCount = 0;
  form.specialNotes = '';
}

function parseBulkRows(value: string): { rows: GreenbushMutationPayload[]; errors: string[] } {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: GreenbushMutationPayload[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const cols = line.split(',').map((col) => col.trim());

    if (index === 0 && cols[0]?.toLowerCase().includes('pickup')) {
      return;
    }

    if (cols.length < 6) {
      errors.push(`Row ${index + 1}: expected at least 6 columns.`);
      return;
    }

    const price = Number(cols[3]);
    const remainingCount = Math.trunc(Number(cols[5]));

    if (!Number.isFinite(price) || !Number.isFinite(remainingCount)) {
      errors.push(`Row ${index + 1}: invalid price or remainingCount.`);
      return;
    }

    rows.push({
      pickupLocation: cols[0] || '',
      destination: cols[1] || '',
      receivingHours: cols[2] || undefined,
      price,
      tarp: cols[4] || undefined,
      remainingCount: Math.max(0, remainingCount),
      specialNotes: cols.slice(6).join(',') || undefined,
    });
  });

  return { rows, errors };
}

function numberFormat(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}
</script>
