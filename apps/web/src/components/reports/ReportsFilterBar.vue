<template>
  <section class="rounded-2xl border border-zinc-200 bg-white/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" :class="panelButtonClass('time')" @click="togglePanel('time')">Time Filters</button>
      <button type="button" :class="panelButtonClass('order')" @click="togglePanel('order')">Order Filters</button>
      <button type="button" :class="panelButtonClass('users')" @click="togglePanel('users')">Users Filter</button>

      <button
        type="button"
        class="ml-auto rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="emit('reset')"
      >
        Reset Filters
      </button>
    </div>

    <div v-if="activePanel" class="mt-3 rounded-xl border border-zinc-200 bg-white/90 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div v-if="activePanel === 'time'" class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
          Quick Range
          <select
            class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            :value="filters.quickRange"
            @change="handleQuickRangeChange"
          >
            <option value="all">All</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">YTD</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
          Date Field
          <select
            class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            :value="filters.dateDimension"
            @change="updateField('dateDimension', ($event.target as HTMLSelectElement).value as DateDimension)"
          >
            <option value="pu_date">Pickup Date</option>
            <option value="del_date">Delivery Date</option>
            <option value="created_at">Created Date</option>
          </select>
        </label>

        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
          Group By
          <select
            class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            :value="filters.dateGroupBy"
            @change="updateField('dateGroupBy', ($event.target as HTMLSelectElement).value as DateGroupBy)"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </label>

        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
          Date From
          <input
            type="date"
            class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            :value="filters.dateFrom"
            @input="updateField('dateFrom', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">
          Date To
          <input
            type="date"
            class="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            :value="filters.dateTo"
            @input="updateField('dateTo', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>

      <div v-else-if="activePanel === 'order'" class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Customer Type</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('customerTypes')">
              Clear
            </button>
          </div>
          <div class="h-36 space-y-1 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <label v-for="type in customerTypeOptions" :key="type" class="flex items-center gap-2">
              <input type="checkbox" :checked="filters.customerTypes.includes(type)" @change="toggleArrayValue('customerTypes', type)" />
              <span>{{ type }}</span>
            </label>
            <p v-if="customerTypeOptions.length === 0" class="text-zinc-500">No options</p>
          </div>
        </section>

        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Customer Name</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('customerNames')">
              Clear
            </button>
          </div>
          <input
            v-model="customerSearch"
            type="text"
            placeholder="Search customer"
            class="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div ref="customerNamesListRef" class="h-36 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <div
              v-if="customerNameListOptions.selected.length > 0"
              class="sticky top-0 z-10 -mx-2 mb-2 border-b border-zinc-200 bg-white/95 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/95"
            >
              <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand-red">Selected</p>
              <div class="space-y-1">
                <label v-for="name in customerNameListOptions.selected" :key="`selected-customer-${name}`" class="flex items-center gap-2">
                  <input type="checkbox" :checked="true" @change="toggleArrayValue('customerNames', name)" />
                  <span>{{ name }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-1">
              <label v-for="name in customerNameListOptions.unselected" :key="name" class="flex items-center gap-2">
                <input type="checkbox" :checked="false" @change="toggleArrayValue('customerNames', name)" />
                <span>{{ name }}</span>
              </label>
            </div>

            <p v-if="customerOptions.length === 0" class="text-zinc-500">No options</p>
            <p v-else-if="customerNameListOptions.unselected.length === 0 && customerNameListOptions.selected.length === 0" class="text-zinc-500">No matches</p>
          </div>
        </section>

        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Load Status</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('loadStatuses')">
              Clear
            </button>
          </div>
          <div class="h-36 space-y-1 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <label v-for="status in statusOptions" :key="status" class="flex items-center gap-2">
              <input type="checkbox" :checked="filters.loadStatuses.includes(status)" @change="toggleStatusValue(status)" />
              <span>{{ formatStatusLabel(status) }}</span>
            </label>
            <p v-if="statusOptions.length === 0" class="text-zinc-500">No options</p>
          </div>
        </section>
      </div>

      <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Account Manager</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('accountManagerNames')">
              Clear
            </button>
          </div>
          <input
            v-model="accountManagerSearch"
            type="text"
            placeholder="Search account manager"
            class="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div ref="accountManagersListRef" class="h-36 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <div
              v-if="accountManagerListOptions.selected.length > 0"
              class="sticky top-0 z-10 -mx-2 mb-2 border-b border-zinc-200 bg-white/95 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/95"
            >
              <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand-red">Selected</p>
              <div class="space-y-1">
                <label v-for="name in accountManagerListOptions.selected" :key="`selected-am-${name}`" class="flex items-center gap-2">
                  <input type="checkbox" :checked="true" @change="toggleArrayValue('accountManagerNames', name)" />
                  <span>{{ name }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-1">
              <label v-for="name in accountManagerListOptions.unselected" :key="name" class="flex items-center gap-2">
                <input type="checkbox" :checked="false" @change="toggleArrayValue('accountManagerNames', name)" />
                <span>{{ name }}</span>
              </label>
            </div>

            <p v-if="accountManagerOptions.length === 0" class="text-zinc-500">No options</p>
            <p v-else-if="accountManagerListOptions.unselected.length === 0 && accountManagerListOptions.selected.length === 0" class="text-zinc-500">No matches</p>
          </div>
        </section>

        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Dispatcher</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('dispatcherNames')">
              Clear
            </button>
          </div>
          <input
            v-model="dispatcherSearch"
            type="text"
            placeholder="Search dispatcher"
            class="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div ref="dispatchersListRef" class="h-36 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <div
              v-if="dispatcherListOptions.selected.length > 0"
              class="sticky top-0 z-10 -mx-2 mb-2 border-b border-zinc-200 bg-white/95 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/95"
            >
              <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand-red">Selected</p>
              <div class="space-y-1">
                <label v-for="name in dispatcherListOptions.selected" :key="`selected-dispatcher-${name}`" class="flex items-center gap-2">
                  <input type="checkbox" :checked="true" @change="toggleArrayValue('dispatcherNames', name)" />
                  <span>{{ name }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-1">
              <label v-for="name in dispatcherListOptions.unselected" :key="name" class="flex items-center gap-2">
                <input type="checkbox" :checked="false" @change="toggleArrayValue('dispatcherNames', name)" />
                <span>{{ name }}</span>
              </label>
            </div>

            <p v-if="dispatcherOptions.length === 0" class="text-zinc-500">No options</p>
            <p v-else-if="dispatcherListOptions.unselected.length === 0 && dispatcherListOptions.selected.length === 0" class="text-zinc-500">No matches</p>
          </div>
        </section>

        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Driver</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('driverNames')">
              Clear
            </button>
          </div>
          <input
            v-model="driverSearch"
            type="text"
            placeholder="Search driver"
            class="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div ref="driversListRef" class="h-36 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <div
              v-if="driverListOptions.selected.length > 0"
              class="sticky top-0 z-10 -mx-2 mb-2 border-b border-zinc-200 bg-white/95 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/95"
            >
              <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand-red">Selected</p>
              <div class="space-y-1">
                <label v-for="name in driverListOptions.selected" :key="`selected-driver-${name}`" class="flex items-center gap-2">
                  <input type="checkbox" :checked="true" @change="toggleArrayValue('driverNames', name)" />
                  <span>{{ name }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-1">
              <label v-for="name in driverListOptions.unselected" :key="name" class="flex items-center gap-2">
                <input type="checkbox" :checked="false" @change="toggleArrayValue('driverNames', name)" />
                <span>{{ name }}</span>
              </label>
            </div>

            <p v-if="driverOptions.length === 0" class="text-zinc-500">No options</p>
            <p v-else-if="driverListOptions.unselected.length === 0 && driverListOptions.selected.length === 0" class="text-zinc-500">No matches</p>
          </div>
        </section>

        <section>
          <div class="mb-1 flex items-center justify-between">
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Truck</h4>
            <button type="button" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-700" @click="clearArray('truckNumbers')">
              Clear
            </button>
          </div>
          <input
            v-model="truckSearch"
            type="text"
            placeholder="Search truck"
            class="mb-1 w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div ref="trucksListRef" class="h-36 overflow-auto rounded border border-zinc-300 p-2 text-xs dark:border-zinc-700">
            <div
              v-if="truckListOptions.selected.length > 0"
              class="sticky top-0 z-10 -mx-2 mb-2 border-b border-zinc-200 bg-white/95 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/95"
            >
              <p class="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand-red">Selected</p>
              <div class="space-y-1">
                <label v-for="truck in truckListOptions.selected" :key="`selected-truck-${truck}`" class="flex items-center gap-2">
                  <input type="checkbox" :checked="true" @change="toggleArrayValue('truckNumbers', truck)" />
                  <span>{{ truck }}</span>
                </label>
              </div>
            </div>

            <div class="space-y-1">
              <label v-for="truck in truckListOptions.unselected" :key="truck" class="flex items-center gap-2">
                <input type="checkbox" :checked="false" @change="toggleArrayValue('truckNumbers', truck)" />
                <span>{{ truck }}</span>
              </label>
            </div>

            <p v-if="truckOptions.length === 0" class="text-zinc-500">No options</p>
            <p v-else-if="truckListOptions.unselected.length === 0 && truckListOptions.selected.length === 0" class="text-zinc-500">No matches</p>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { LoadStatus } from '@antigravity/shared';

import {
  buildQuickRangeBounds,
  formatStatusLabel,
  type DateDimension,
  type DateGroupBy,
  type QuickRange,
  type ReportsGlobalFilters,
} from './reportHelpers';

type FilterArrayKey =
  | 'customerTypes'
  | 'customerNames'
  | 'loadStatuses'
  | 'accountManagerNames'
  | 'dispatcherNames'
  | 'driverNames'
  | 'truckNumbers';

const props = defineProps<{
  filters: ReportsGlobalFilters;
  customerTypeOptions: string[];
  customerOptions: string[];
  accountManagerOptions: string[];
  dispatcherOptions: string[];
  driverOptions: string[];
  truckOptions: string[];
  statusOptions: LoadStatus[];
}>();

const emit = defineEmits<{
  reset: [];
  'update:filters': [value: ReportsGlobalFilters];
}>();

const activePanel = ref<'time' | 'order' | 'users' | null>('time');
const customerSearch = ref('');
const accountManagerSearch = ref('');
const dispatcherSearch = ref('');
const driverSearch = ref('');
const truckSearch = ref('');
const customerNamesListRef = ref<HTMLDivElement | null>(null);
const accountManagersListRef = ref<HTMLDivElement | null>(null);
const dispatchersListRef = ref<HTMLDivElement | null>(null);
const driversListRef = ref<HTMLDivElement | null>(null);
const trucksListRef = ref<HTMLDivElement | null>(null);

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function filterOptions(options: string[], query: string): string[] {
  const term = query.trim().toLowerCase();
  if (!term) {
    return options;
  }

  return options.filter((option) => option.toLowerCase().includes(term));
}

function splitSelectedAndFiltered(options: string[], selected: string[], query: string): { selected: string[]; unselected: string[] } {
  const selectedSet = new Set(selected.map(normalizeValue));
  const selectedItems = options.filter((option) => selectedSet.has(normalizeValue(option)));
  const unselectedItems = options.filter((option) => !selectedSet.has(normalizeValue(option)));

  const selectedKeys = new Set(selectedItems.map(normalizeValue));
  const extraSelected = selected.filter((value) => !selectedKeys.has(normalizeValue(value)));

  return {
    selected: [...selectedItems, ...extraSelected],
    unselected: filterOptions(unselectedItems, query),
  };
}

const customerNameListOptions = computed(() =>
  splitSelectedAndFiltered(props.customerOptions, props.filters.customerNames, customerSearch.value),
);

const accountManagerListOptions = computed(() =>
  splitSelectedAndFiltered(props.accountManagerOptions, props.filters.accountManagerNames, accountManagerSearch.value),
);

const dispatcherListOptions = computed(() =>
  splitSelectedAndFiltered(props.dispatcherOptions, props.filters.dispatcherNames, dispatcherSearch.value),
);

const driverListOptions = computed(() =>
  splitSelectedAndFiltered(props.driverOptions, props.filters.driverNames, driverSearch.value),
);

const truckListOptions = computed(() =>
  splitSelectedAndFiltered(props.truckOptions, props.filters.truckNumbers, truckSearch.value),
);

function patch(next: Partial<ReportsGlobalFilters>): void {
  emit('update:filters', {
    ...props.filters,
    ...next,
  });
}

function panelButtonClass(panel: 'time' | 'order' | 'users'): string {
  const active = activePanel.value === panel;
  return active
    ? 'rounded bg-brand-red px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white'
    : 'rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800';
}

function togglePanel(panel: 'time' | 'order' | 'users'): void {
  if (activePanel.value === panel) {
    activePanel.value = null;
    return;
  }

  activePanel.value = panel;
}

function handleQuickRangeChange(event: Event): void {
  const nextRange = (event.target as HTMLSelectElement).value as QuickRange;

  if (nextRange === 'custom') {
    patch({ quickRange: nextRange });
    return;
  }

  const bounds = buildQuickRangeBounds(nextRange);
  patch({
    quickRange: nextRange,
    dateFrom: bounds.from,
    dateTo: bounds.to,
  });
}

function updateField<K extends keyof ReportsGlobalFilters>(key: K, value: ReportsGlobalFilters[K]): void {
  patch({
    quickRange: key === 'dateFrom' || key === 'dateTo' ? 'custom' : props.filters.quickRange,
    [key]: value,
  } as Partial<ReportsGlobalFilters>);
}

function clearArray(key: FilterArrayKey): void {
  patch({ [key]: [] } as Partial<ReportsGlobalFilters>);
}

function scrollSelectedBlockIntoView(key: FilterArrayKey): void {
  nextTick(() => {
    if (key === 'customerNames' && customerNamesListRef.value) {
      customerNamesListRef.value.scrollTop = 0;
      return;
    }

    if (key === 'accountManagerNames' && accountManagersListRef.value) {
      accountManagersListRef.value.scrollTop = 0;
      return;
    }

    if (key === 'dispatcherNames' && dispatchersListRef.value) {
      dispatchersListRef.value.scrollTop = 0;
      return;
    }

    if (key === 'driverNames' && driversListRef.value) {
      driversListRef.value.scrollTop = 0;
      return;
    }

    if (key === 'truckNumbers' && trucksListRef.value) {
      trucksListRef.value.scrollTop = 0;
    }
  });
}

function toggleArrayValue(key: FilterArrayKey, value: string): void {
  const current = props.filters[key] as string[];
  const normalized = normalizeValue(value);
  const exists = current.some((item) => normalizeValue(item) === normalized);
  patch({
    [key]: exists ? current.filter((item) => normalizeValue(item) !== normalized) : [...current, value],
  } as Partial<ReportsGlobalFilters>);

  if (key === 'customerNames' || key === 'accountManagerNames' || key === 'dispatcherNames' || key === 'driverNames' || key === 'truckNumbers') {
    scrollSelectedBlockIntoView(key);
  }
}

function toggleStatusValue(status: LoadStatus): void {
  const current = props.filters.loadStatuses;
  const exists = current.includes(status);
  patch({
    loadStatuses: exists ? current.filter((item) => item !== status) : [...current, status],
  });
}
</script>
