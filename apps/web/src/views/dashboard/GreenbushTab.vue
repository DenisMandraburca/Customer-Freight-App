<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">Greenbush Bank</h3>
      <p class="text-xs text-zinc-700">{{ filteredGreenbushRows.length }} rows</p>
    </header>

    <div class="mb-4 flex flex-col gap-4 lg:flex-row">
      <div
        class="w-full glass-panel rounded-xl transition-all duration-200 lg:w-[30%]"
        :class="manualPanelExpanded || !canManage ? 'space-y-3 p-4' : 'space-y-2 p-3'"
      >
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">Search</h3>
        <input
          v-model="greenbushSearch"
          type="text"
          placeholder="Pickup location or destination..."
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p v-if="!manualPanelExpanded && canManage" class="text-[10px] text-zinc-600">
          {{ greenbushSearch ? 'Search active' : 'Search ready' }}
        </p>
      </div>

      <div v-if="canManage" class="flex-1 glass-panel rounded-xl p-3 transition-all duration-200">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">
            {{ editingId ? 'Edit Route' : 'Add Load Manually' }}
          </h3>
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="manualPanelExpanded = !manualPanelExpanded"
          >
            {{ manualPanelExpanded ? 'Collapse' : 'Expand' }}
          </button>
        </div>
        <p v-if="!manualPanelExpanded" class="mt-2 text-[11px] text-zinc-700 dark:text-zinc-400">
          Expand to add or edit Greenbush routes.
        </p>
        <form v-show="manualPanelExpanded" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="submitRow">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Pickup Location
            <input v-model="form.pickupLocation" required class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Destination
            <input v-model="form.destination" required class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Receiving Hours
            <input v-model="form.receivingHours" placeholder="e.g. 06:00 - 22:00" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Price ($)
            <input v-model.number="form.price" required type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Tarp
            <select v-model="form.tarp" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
              <option value="Optional">Optional</option>
            </select>
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Amount / Count
            <input v-model.number="form.remainingCount" type="number" min="1" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 sm:col-span-2">
            Special Notes
            <textarea v-model="form.specialNotes" rows="2" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <div class="sm:col-span-2 flex gap-2">
            <button type="submit" class="rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
              {{ editingId ? 'Save Changes' : 'Add Load' }}
            </button>
            <button v-if="editingId" type="button" class="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800" @click="resetForm">
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
              <th class="px-3 py-2">Pickup Location</th>
              <th class="px-3 py-2">Destination</th>
              <th class="px-3 py-2">Hours</th>
              <th class="px-3 py-2">Price</th>
              <th class="px-3 py-2">Tarp</th>
              <th class="px-3 py-2">Amount</th>
              <th class="px-3 py-2">Reserved</th>
              <th class="px-3 py-2">Available</th>
              <th class="px-3 py-2">Notes</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr v-for="row in filteredGreenbushRows" :key="row.id">
              <td class="px-3 py-2">{{ row.pickup_location }}</td>
              <td class="px-3 py-2">{{ row.destination }}</td>
              <td class="px-3 py-2">{{ row.receiving_hours ?? '-' }}</td>
              <td class="px-3 py-2">${{ money(row.price) }}</td>
              <td class="px-3 py-2">{{ row.tarp || 'No' }}</td>
              <td class="px-3 py-2">{{ row.remaining_count }}</td>
              <td class="px-3 py-2">{{ row.reserved_count }}</td>
              <td class="px-3 py-2">{{ available(row) }}</td>
              <td class="px-3 py-2" :title="row.special_notes ?? ''">{{ shortNotes(row.special_notes) }}</td>
              <td class="px-3 py-2 text-right">
                <div class="inline-flex gap-1">
                  <button v-if="canQuote && available(row) > 0" type="button" class="rounded bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white" @click="emit('open-quote', row.id)">Quote</button>
                  <button v-if="canManage" type="button" class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" @click="startEdit(row)">Edit</button>
                  <button v-if="canManage" type="button" class="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white" @click="emit('delete', row.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredGreenbushRows.length === 0">
              <td colspan="10" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <article v-if="canManage" class="rounded-xl border border-zinc-200 bg-white/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/20">
      <h4 class="text-xs font-black uppercase tracking-widest text-zinc-700">Bulk Replace</h4>
      <p class="mt-1 text-xs text-zinc-700">Paste tab-delimited rows and preview before replacing.</p>
      <textarea v-model="bulkInput" rows="6" class="mt-2 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"></textarea>
      <div class="mt-2 flex gap-2">
        <button type="button" class="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" @click="previewBulk">Preview</button>
        <button type="button" class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" :disabled="previewRows.length === 0" @click="confirmBulk">Confirm Replace</button>
      </div>
      <p v-if="previewError" class="mt-2 text-xs text-rose-600 dark:text-rose-400">{{ previewError }}</p>
      <div v-if="previewRows.length > 0" class="mt-3 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th class="px-2 py-1">Pickup</th>
                <th class="px-2 py-1">Destination</th>
                <th class="px-2 py-1">Hours</th>
                <th class="px-2 py-1">Price</th>
                <th class="px-2 py-1">Tarp</th>
                <th class="px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="(row, index) in previewRows" :key="index">
                <td class="px-2 py-1">{{ row.pickupLocation }}</td>
                <td class="px-2 py-1">{{ row.destination }}</td>
                <td class="px-2 py-1">{{ row.receivingHours }}</td>
                <td class="px-2 py-1">${{ money(row.price) }}</td>
                <td class="px-2 py-1">{{ row.tarp || '-' }}</td>
                <td class="px-2 py-1">{{ row.remainingCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
  delete: [rowId: string];
  increment: [rowId: string];
  'bulk-replace': [rows: GreenbushMutationPayload[]];
}>();

const greenbushSearch = ref('');
const manualPanelExpanded = ref(false);
const editingId = ref('');
const bulkInput = ref('');
const previewRows = ref<GreenbushMutationPayload[]>([]);
const previewError = ref('');

const form = reactive<GreenbushMutationPayload>({
  pickupLocation: '',
  destination: '',
  receivingHours: '',
  price: 0,
  tarp: 'No',
  remainingCount: 1,
  specialNotes: '',
});

const destinationResolveMap: Record<string, string> = {
  PA: 'Pennsylvania',
  MD: 'Maryland',
  VA: 'Virginia',
  GA: 'Georgia',
  RI: 'Rhode Island',
};

const destinationHoursDefaults: Record<string, string> = {
  Pennsylvania: '06:00 - 14:00',
  Maryland: '07:00 - 15:00',
  Virginia: '06:00 - 14:00',
  Georgia: '07:00 - 16:00',
  'Rhode Island': '06:00 - 13:00',
};

const filteredGreenbushRows = computed(() =>
  props.rows.filter((row) => {
    const q = greenbushSearch.value.trim().toLowerCase();
    if (!q) return true;
    return row.pickup_location.toLowerCase().includes(q) || row.destination.toLowerCase().includes(q);
  }),
);

function available(row: GreenbushRecord): number {
  return Math.max(0, row.remaining_count - row.reserved_count);
}

function startEdit(row: GreenbushRecord): void {
  manualPanelExpanded.value = true;
  editingId.value = row.id;
  form.pickupLocation = row.pickup_location;
  form.destination = row.destination;
  form.receivingHours = row.receiving_hours ?? '';
  form.price = Number(row.price);
  form.tarp = row.tarp ?? 'No';
  form.remainingCount = row.remaining_count;
  form.specialNotes = row.special_notes ?? '';
}

function resetForm(): void {
  editingId.value = '';
  form.pickupLocation = '';
  form.destination = '';
  form.receivingHours = '';
  form.price = 0;
  form.tarp = 'No';
  form.remainingCount = 1;
  form.specialNotes = '';
}

function submitRow(): void {
  const payload: GreenbushMutationPayload = {
    pickupLocation: form.pickupLocation.trim(),
    destination: form.destination.trim(),
    receivingHours: form.receivingHours?.trim() || undefined,
    price: Number(form.price),
    tarp: form.tarp?.trim() || undefined,
    remainingCount: Math.max(1, Math.trunc(form.remainingCount)),
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

function previewBulk(): void {
  previewError.value = '';
  const parsed = parseBulkRows(bulkInput.value);
  if (parsed.errors.length > 0) {
    previewRows.value = [];
    previewError.value = parsed.errors[0] ?? 'Invalid bulk input.';
    return;
  }

  previewRows.value = parsed.rows;
}

function confirmBulk(): void {
  if (previewRows.value.length === 0) {
    return;
  }
  emit('bulk-replace', previewRows.value);
  bulkInput.value = '';
  previewRows.value = [];
  previewError.value = '';
}

function parseBulkRows(raw: string): { rows: GreenbushMutationPayload[]; errors: string[] } {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const rows: GreenbushMutationPayload[] = [];
  const errors: string[] = [];
  let formatWithHours = true;

  lines.forEach((line, index) => {
    const columns = line.split('\t').map((column) => column.trim());

    if (index === 0) {
      const firstCol = columns[0]?.toLowerCase() || '';
      if (firstCol.includes('pickup')) {
        const thirdCol = columns[2]?.toLowerCase() || '';
        if (thirdCol.includes('price')) {
          formatWithHours = false;
        }
        return;
      }
      const secondColIsNum = !Number.isNaN(Number(columns[1])) && columns[1] !== '';
      const thirdColIsNum = !Number.isNaN(Number(columns[2])) && columns[2] !== '';
      if (thirdColIsNum && !secondColIsNum) {
        formatWithHours = false;
      }
    }

    const minCols = formatWithHours ? 6 : 5;
    if (columns.length < minCols) {
      errors.push(`Row ${index + 1}: expected at least ${minCols} tab-delimited columns.`);
      return;
    }

    let pickupLocation: string;
    let destination: string;
    let receivingHours: string | undefined;
    let price: number;
    let tarp: string | undefined;
    let remainingCount: number;
    let specialNotes: string | undefined;

    if (formatWithHours) {
      pickupLocation = columns[0] || '';
      const destinationRaw = columns[1] || '';
      destination = resolveDestination(destinationRaw);
      receivingHours = columns[2] || destinationHoursDefaults[destination] || undefined;
      price = Number(columns[3]);
      tarp = columns[4] || undefined;
      remainingCount = Math.trunc(Number(columns[5]));
      specialNotes = columns.slice(6).join('\t') || undefined;
    } else {
      pickupLocation = columns[0] || '';
      const destinationRaw = columns[1] || '';
      destination = resolveDestination(destinationRaw);
      receivingHours = destinationHoursDefaults[destination] || undefined;
      price = Number(columns[2]);
      tarp = columns[3] || undefined;
      remainingCount = Math.trunc(Number(columns[4]));
      specialNotes = columns.slice(5).join('\t') || undefined;
    }

    if (!pickupLocation || !destination) {
      errors.push(`Row ${index + 1}: pickup and destination are required.`);
      return;
    }

    if (!Number.isFinite(price) || !Number.isFinite(remainingCount)) {
      errors.push(`Row ${index + 1}: invalid price or amount.`);
      return;
    }

    rows.push({
      pickupLocation,
      destination,
      receivingHours,
      price: Math.max(0, price),
      tarp,
      remainingCount: Math.max(0, remainingCount),
      specialNotes: specialNotes?.trim() || undefined,
    });
  });

  return { rows, errors };
}

function resolveDestination(value: string): string {
  const upper = value.trim().toUpperCase();
  return destinationResolveMap[upper] ?? value.trim();
}

function shortNotes(notes: string | null): string {
  if (!notes) return '-';
  if (notes.length <= 40) return notes;
  return `${notes.slice(0, 40)}...`;
}

function money(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>
