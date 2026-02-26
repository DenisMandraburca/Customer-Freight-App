<template>
  <section class="space-y-6">
    <div class="space-y-3">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
          <h3 class="text-xs font-black uppercase tracking-widest text-zinc-600">Available Loads</h3>
        </div>
        <p class="text-[10px] font-bold text-zinc-700">{{ sortedAvailableLoads.length }} open</p>
      </header>

      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition-transform duration-200 hover:text-zinc-700 dark:hover:text-zinc-200"
            :class="availableExpanded ? '' : '-rotate-90'"
            :aria-label="availableExpanded ? 'Collapse table' : 'Expand table'"
            @click="availableExpanded = !availableExpanded"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">Available Loads</h3>

          <div class="ml-auto flex items-center gap-2">
            <span class="text-[10px] text-zinc-600">Show:</span>
            <select
              v-model="availablePerPage"
              class="rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              @change="availablePage = 1"
            >
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-show="availableExpanded">
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <tr>
                    <th class="px-3 py-2">Specs</th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'ref')">
                      Ref #
                      <span v-if="availableSort.column === 'ref'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'route')">
                      Route
                      <span v-if="availableSort.column === 'route'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'pu_date')">
                      PU Date
                      <span v-if="availableSort.column === 'pu_date'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'del_date')">
                      DEL Date
                      <span v-if="availableSort.column === 'del_date'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'rate')">
                      Rate
                      <span v-if="availableSort.column === 'rate'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'miles')">
                      Miles
                      <span v-if="availableSort.column === 'miles'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'rpm')">
                      RPM
                      <span v-if="availableSort.column === 'rpm'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(availableSort, 'am')">
                      A.M.
                      <span v-if="availableSort.column === 'am'" class="ml-1 text-[10px]">{{ availableSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr v-for="load in paginatedAvailableLoads" :key="load.id" class="hover:bg-white/70 dark:hover:bg-zinc-800/30">
                    <td class="px-3 py-2">
                      <button
                        v-if="hasSpecs(load)"
                        type="button"
                        class="rounded px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-700 dark:hover:bg-blue-950/30"
                        @click="openSpecs(load)"
                      >
                        Specs
                      </button>
                      <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
                    </td>
                    <td class="px-3 py-2 font-semibold text-zinc-800 dark:text-zinc-200" :title="historyTooltip(load)">
                      <div>{{ load.load_ref_number || '—' }}</div>
                      <div v-if="load.mcleod_order_id" class="text-[10px] font-normal text-zinc-600">McLeod: {{ load.mcleod_order_id }}</div>
                    </td>
                    <td class="px-3 py-2 text-zinc-700 dark:text-zinc-300">{{ load.pu_city }}, {{ load.pu_state }} → {{ load.del_city }}, {{ load.del_state }}</td>
                    <td class="px-3 py-2">
                      <div>{{ formatDateDisplay(load.pu_date) || '—' }}</div>
                      <span v-if="appt(load.pu_appt, load.pu_appt_time).show" :class="appt(load.pu_appt, load.pu_appt_time).className">
                        {{ appt(load.pu_appt, load.pu_appt_time).text }}
                      </span>
                    </td>
                    <td class="px-3 py-2">
                      <div>{{ formatDateDisplay(load.del_date) || '—' }}</div>
                      <span v-if="appt(load.del_appt, load.del_appt_time).show" :class="appt(load.del_appt, load.del_appt_time).className">
                        {{ appt(load.del_appt, load.del_appt_time).text }}
                      </span>
                    </td>
                    <td class="px-3 py-2 font-semibold">${{ money(load.rate) }}</td>
                    <td class="px-3 py-2">{{ Number(load.miles) }}</td>
                    <td class="px-3 py-2 font-semibold text-red-700 dark:text-red-400">${{ money(load.rpm) }}</td>
                    <td class="px-3 py-2">{{ load.account_manager_name || '—' }}</td>
                    <td class="px-3 py-2 text-right">
                      <div v-if="role !== 'VIEWER'" class="inline-flex gap-1">
                        <button
                          v-if="canBook"
                          type="button"
                          class="rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-800"
                          @click="emit('book', load.id)"
                        >
                          Book Now
                        </button>
                        <button
                          v-if="canQuote && load.customer_quote_accept"
                          type="button"
                          class="rounded bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-800"
                          @click="emit('quote', load.id)"
                        >
                          Quote
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="paginatedAvailableLoads.length === 0">
                    <td colspan="10" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="availablePerPage !== 'All' && availableTotalPages > 1"
              class="flex items-center justify-between px-3 pt-2 text-xs text-zinc-700"
            >
              <span>
                Showing {{ availableStart }}–{{ availableEnd }} of {{ sortedAvailableLoads.length }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  :disabled="availablePage === 1"
                  class="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  @click="availablePage -= 1"
                >
                  ‹
                </button>
                <span>{{ availablePage }} / {{ availableTotalPages }}</span>
                <button
                  :disabled="availablePage === availableTotalPages"
                  class="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  @click="availablePage += 1"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div v-if="canSeeGreenbush" class="space-y-3">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          <h3 class="text-xs font-black uppercase tracking-widest text-zinc-600">Available Greenbush</h3>
        </div>
        <p class="text-[10px] font-bold text-zinc-700">{{ sortedGreenbushLoads.length }} routes</p>
      </header>

      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <button
            type="button"
            class="flex h-5 w-5 items-center justify-center rounded text-zinc-600 transition-transform duration-200 hover:text-zinc-700 dark:hover:text-zinc-200"
            :class="greenbushExpanded ? '' : '-rotate-90'"
            :aria-label="greenbushExpanded ? 'Collapse table' : 'Expand table'"
            @click="greenbushExpanded = !greenbushExpanded"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">Available Greenbush Loads</h3>

          <div class="ml-auto flex items-center gap-2">
            <span class="text-[10px] text-zinc-600">Show:</span>
            <select
              v-model="greenbushPerPage"
              class="rounded border border-zinc-300 px-1 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              @change="greenbushPage = 1"
            >
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>

        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-show="greenbushExpanded">
            <div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  <tr>
                    <th class="px-3 py-2">Specs</th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(greenbushSort, 'route')">
                      Route
                      <span v-if="greenbushSort.column === 'route'" class="ml-1 text-[10px]">{{ greenbushSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="px-3 py-2">Hours</th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(greenbushSort, 'price')">
                      Price
                      <span v-if="greenbushSort.column === 'price'" class="ml-1 text-[10px]">{{ greenbushSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="px-3 py-2">Tarp</th>
                    <th class="cursor-pointer select-none px-3 py-2 hover:text-zinc-900 dark:hover:text-white" @click="cycleSort(greenbushSort, 'available')">
                      Available
                      <span v-if="greenbushSort.column === 'available'" class="ml-1 text-[10px]">{{ greenbushSort.dir === 'asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                  <tr v-for="row in paginatedGreenbushLoads" :key="row.id" class="hover:bg-white/70 dark:hover:bg-zinc-800/30">
                    <td class="px-3 py-2">
                      <button
                        v-if="row.special_notes && row.special_notes.trim()"
                        type="button"
                        class="rounded px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-700 dark:hover:bg-blue-950/30"
                        @click="openGreenbushSpecs(row.special_notes)"
                      >
                        Specs
                      </button>
                      <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
                    </td>
                    <td class="px-3 py-2">{{ row.pickup_location }} → {{ row.destination }}</td>
                    <td class="px-3 py-2">{{ row.receiving_hours || '—' }}</td>
                    <td class="px-3 py-2 font-semibold">${{ money(row.price) }}</td>
                    <td class="px-3 py-2">{{ row.tarp || 'No' }}</td>
                    <td class="px-3 py-2">{{ availableCount(row) }} available</td>
                    <td class="px-3 py-2 text-right">
                      <button
                        v-if="canQuoteGreenbush"
                        type="button"
                        class="rounded bg-blue-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-800"
                        @click="emit('quote-greenbush', row.id)"
                      >
                        Quote
                      </button>
                    </td>
                  </tr>
                  <tr v-if="paginatedGreenbushLoads.length === 0">
                    <td colspan="7" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-if="greenbushPerPage !== 'All' && greenbushTotalPages > 1"
              class="flex items-center justify-between px-3 pt-2 text-xs text-zinc-700"
            >
              <span>
                Showing {{ greenbushStart }}–{{ greenbushEnd }} of {{ sortedGreenbushLoads.length }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  :disabled="greenbushPage === 1"
                  class="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  @click="greenbushPage -= 1"
                >
                  ‹
                </button>
                <span>{{ greenbushPage }} / {{ greenbushTotalPages }}</span>
                <button
                  :disabled="greenbushPage === greenbushTotalPages"
                  class="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                  @click="greenbushPage += 1"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <SpecsModal
      v-if="selectedLoadId"
      :notes="selectedSpecs"
      :editable="canEditSpecs"
      title="Load Specs"
      @close="closeSpecs"
      @save="saveSpecs"
    />

    <SpecsModal
      v-if="greenbushSpecsText"
      :notes="greenbushSpecsText"
      :editable="false"
      title="Load Specs"
      @close="greenbushSpecsText = ''"
      @save="() => undefined"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Ref } from 'vue';
import type { UserRole } from '@antigravity/shared';

import SpecsModal from '@/components/loads/SpecsModal.vue';
import { renderApptBadge } from '@/composables/useApptBadge';
import { formatDateDisplay } from '@/utils/dateFormat';
import type { GreenbushRecord, LoadRecord } from '@/types/models';

type SortState = { column: string; dir: 'asc' | 'desc' | null };
type PerPage = number | 'All';

const props = defineProps<{
  loads: LoadRecord[];
  greenbush: GreenbushRecord[];
  canBook: boolean;
  canQuote: boolean;
  canQuoteGreenbush: boolean;
  role: UserRole;
}>();

const emit = defineEmits<{
  book: [loadId: string];
  quote: [loadId: string];
  'quote-greenbush': [greenbushId: string];
  'save-specs': [payload: { loadId: string; notes: string }];
}>();

const selectedLoadId = ref('');
const selectedSpecs = ref('');
const greenbushSpecsText = ref('');

const availableExpanded = ref(true);
const greenbushExpanded = ref(true);

const availableSort = ref<SortState>({ column: '', dir: null });
const greenbushSort = ref<SortState>({ column: '', dir: null });

const availablePage = ref(1);
const availablePerPage = ref<PerPage>(25);
const greenbushPage = ref(1);
const greenbushPerPage = ref<PerPage>(25);

const availableLoads = computed(() => props.loads.filter((load) => load.status === 'AVAILABLE'));

const canSeeGreenbush = computed(() =>
  ['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER'].includes(props.role),
);

const canEditSpecs = computed(() =>
  ['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER'].includes(props.role),
);

const greenbushAvailable = computed(() =>
  props.greenbush.filter((row) => availableCount(row) > 0),
);

const sortedAvailableLoads = computed(() => {
  const rows = [...availableLoads.value];
  const sort = availableSort.value;

  if (!sort.column || !sort.dir) {
    return rows;
  }

  return rows.sort((left, right) => {
    const leftValue = getAvailableSortValue(left, sort.column);
    const rightValue = getAvailableSortValue(right, sort.column);
    const cmp = compareValues(leftValue, rightValue);
    if (cmp === 0) {
      return left.id.localeCompare(right.id);
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  });
});

const sortedGreenbushLoads = computed(() => {
  const rows = [...greenbushAvailable.value];
  const sort = greenbushSort.value;

  if (!sort.column || !sort.dir) {
    return rows;
  }

  return rows.sort((left, right) => {
    const leftValue = getGreenbushSortValue(left, sort.column);
    const rightValue = getGreenbushSortValue(right, sort.column);
    const cmp = compareValues(leftValue, rightValue);
    if (cmp === 0) {
      return left.id.localeCompare(right.id);
    }
    return sort.dir === 'asc' ? cmp : -cmp;
  });
});

const availableTotalPages = computed(() => {
  if (availablePerPage.value === 'All') {
    return 1;
  }
  const pageSize = Number(availablePerPage.value);
  return Math.max(1, Math.ceil(sortedAvailableLoads.value.length / pageSize));
});

const paginatedAvailableLoads = computed(() => {
  const rows = sortedAvailableLoads.value;
  if (availablePerPage.value === 'All') {
    return rows;
  }

  const pageSize = Number(availablePerPage.value);
  const start = (availablePage.value - 1) * pageSize;
  return rows.slice(start, start + pageSize);
});

const availableStart = computed(() => {
  if (sortedAvailableLoads.value.length === 0) {
    return 0;
  }
  if (availablePerPage.value === 'All') {
    return sortedAvailableLoads.value.length === 0 ? 0 : 1;
  }
  return (availablePage.value - 1) * Number(availablePerPage.value) + 1;
});

const availableEnd = computed(() => {
  if (availablePerPage.value === 'All') {
    return sortedAvailableLoads.value.length;
  }
  return Math.min(availablePage.value * Number(availablePerPage.value), sortedAvailableLoads.value.length);
});

const greenbushTotalPages = computed(() => {
  if (greenbushPerPage.value === 'All') {
    return 1;
  }
  const pageSize = Number(greenbushPerPage.value);
  return Math.max(1, Math.ceil(sortedGreenbushLoads.value.length / pageSize));
});

const paginatedGreenbushLoads = computed(() => {
  const rows = sortedGreenbushLoads.value;
  if (greenbushPerPage.value === 'All') {
    return rows;
  }

  const pageSize = Number(greenbushPerPage.value);
  const start = (greenbushPage.value - 1) * pageSize;
  return rows.slice(start, start + pageSize);
});

const greenbushStart = computed(() => {
  if (sortedGreenbushLoads.value.length === 0) {
    return 0;
  }
  if (greenbushPerPage.value === 'All') {
    return sortedGreenbushLoads.value.length === 0 ? 0 : 1;
  }
  return (greenbushPage.value - 1) * Number(greenbushPerPage.value) + 1;
});

const greenbushEnd = computed(() => {
  if (greenbushPerPage.value === 'All') {
    return sortedGreenbushLoads.value.length;
  }
  return Math.min(greenbushPage.value * Number(greenbushPerPage.value), sortedGreenbushLoads.value.length);
});

watch(
  () => [availablePerPage.value, availableSort.value.column, availableSort.value.dir, sortedAvailableLoads.value.length],
  () => {
    availablePage.value = 1;
  },
);

watch(
  () => [greenbushPerPage.value, greenbushSort.value.column, greenbushSort.value.dir, sortedGreenbushLoads.value.length],
  () => {
    greenbushPage.value = 1;
  },
);

watch(availableTotalPages, (total) => {
  if (availablePage.value > total) {
    availablePage.value = total;
  }
});

watch(greenbushTotalPages, (total) => {
  if (greenbushPage.value > total) {
    greenbushPage.value = total;
  }
});

function cycleSort(sortRef: Ref<SortState>, column: string): void {
  if (sortRef.value.column !== column) {
    sortRef.value = { column, dir: 'asc' };
  } else if (sortRef.value.dir === 'asc') {
    sortRef.value = { column, dir: 'desc' };
  } else if (sortRef.value.dir === 'desc') {
    sortRef.value = { column: '', dir: null };
  } else {
    sortRef.value = { column, dir: 'asc' };
  }
}

function getAvailableSortValue(load: LoadRecord, column: string): string | number {
  if (column === 'ref') return load.load_ref_number ?? '';
  if (column === 'route') return load.pu_city ?? '';
  if (column === 'pu_date') return toDateValue(load.pu_date);
  if (column === 'del_date') return toDateValue(load.del_date);
  if (column === 'rate') return toNumberValue(load.rate);
  if (column === 'miles') return toNumberValue(load.miles);
  if (column === 'rpm') return toNumberValue(load.rpm);
  if (column === 'am') return load.account_manager_name ?? '';
  return '';
}

function getGreenbushSortValue(row: GreenbushRecord, column: string): string | number {
  if (column === 'route') return row.pickup_location ?? '';
  if (column === 'price') return toNumberValue(row.price);
  if (column === 'available') return availableCount(row);
  return '';
}

function compareValues(left: string | number, right: string | number): number {
  const leftIsNumber = typeof left === 'number';
  const rightIsNumber = typeof right === 'number';

  if (leftIsNumber || rightIsNumber) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (leftNumber < rightNumber) return -1;
    if (leftNumber > rightNumber) return 1;
    return 0;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
}

function toDateValue(value: string | null): number {
  if (!value) return -Infinity;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : -Infinity;
}

function toNumberValue(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '0.00';
  }
  return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function appt(flag: boolean, time: string | null) {
  return renderApptBadge(flag, time);
}

function hasSpecs(load: LoadRecord): boolean {
  return Boolean(load.notes?.trim() || load.other_notes?.trim());
}

function specsTextFor(load: LoadRecord): string {
  return [load.notes?.trim(), load.other_notes?.trim()].filter(Boolean).join('\n\n');
}

function openSpecs(load: LoadRecord): void {
  selectedLoadId.value = load.id;
  selectedSpecs.value = specsTextFor(load);
}

function closeSpecs(): void {
  selectedLoadId.value = '';
  selectedSpecs.value = '';
}

function saveSpecs(notes: string): void {
  if (!selectedLoadId.value) {
    return;
  }

  emit('save-specs', {
    loadId: selectedLoadId.value,
    notes,
  });
  closeSpecs();
}

function openGreenbushSpecs(notes: string): void {
  greenbushSpecsText.value = notes;
}

function historyTooltip(load: LoadRecord): string {
  const history: string[] = [];
  if (load.delay_reason) history.push(`Delay: ${load.delay_reason}`);
  if (load.cancel_reason) history.push(`Cancel: ${load.cancel_reason}`);
  if (load.deny_quote_reason) history.push(`Deny: ${load.deny_quote_reason}`);
  return history.join(' | ');
}

function availableCount(row: GreenbushRecord): number {
  return Math.max(0, row.remaining_count - row.reserved_count);
}
</script>
