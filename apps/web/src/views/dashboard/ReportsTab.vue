<template>
  <section class="space-y-4">
    <header class="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200">Reports</h3>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">
            Live analytics from current scoped data. Last updated: {{ lastUpdatedLabel }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            {{ filteredLoads.length }} records in view
          </div>
          <button
            type="button"
            class="rounded bg-brand-red px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-brand-red-strong disabled:opacity-60"
            :disabled="isRefreshing"
            @click="emit('refresh')"
          >
            {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </header>

    <ReportsFilterBar
      :filters="filters"
      :customer-type-options="customerTypeOptions"
      :customer-options="customerOptions"
      :account-manager-options="accountManagerOptions"
      :dispatcher-options="dispatcherOptions"
      :driver-options="driverOptions"
      :truck-options="truckOptions"
      :status-options="statusOptions"
      @update:filters="updateFilters"
      @reset="resetFilters"
    />

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ReportCard
        title="Executive KPI Overview"
        subtitle="Core operational health metrics"
        @open-info="openInfo('kpi')"
        @export-csv="exportReportCsv('kpi', kpiColumns, sortedKpiRows)"
      >
        <div class="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Total Loads</div>
            <div class="mt-1 text-lg font-black text-zinc-800 dark:text-zinc-100">{{ formatNumberValue(kpiMetrics.totalLoads) }}</div>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Delivered</div>
            <div class="mt-1 text-lg font-black text-zinc-800 dark:text-zinc-100">{{ formatNumberValue(kpiMetrics.deliveredLoads) }}</div>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Revenue</div>
            <div class="mt-1 text-lg font-black text-zinc-800 dark:text-zinc-100">{{ formatCurrencyWhole(kpiMetrics.revenue) }}</div>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Avg RPM</div>
            <div class="mt-1 text-lg font-black text-zinc-800 dark:text-zinc-100">{{ formatCurrencyValue(kpiMetrics.avgRpm) }}</div>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div class="text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Exception Rate</div>
            <div class="mt-1 text-lg font-black text-zinc-800 dark:text-zinc-100">{{ formatPercentValue(kpiMetrics.exceptionRate) }}</div>
          </div>
        </div>

        <VChart class="mt-3 h-64 w-full" :option="kpiChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('kpi')"
          >
            {{ detailsOpen.kpi ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.kpi" class="mt-3">
          <SortableReportTable
            :columns="kpiColumns"
            :rows="sortedKpiRows"
            :sort="sortStates.kpi"
            :default-sort="defaultSorts.kpi"
            @sort-change="(key) => onSortChange('kpi', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Load Volume Trend"
        subtitle="Load count by status and period"
        @open-info="openInfo('volume')"
        @export-csv="exportReportCsv('volume', volumeColumns, sortedVolumeRows)"
      >
        <VChart class="h-64 w-full" :option="volumeChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('volume')"
          >
            {{ detailsOpen.volume ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.volume" class="mt-3">
          <SortableReportTable
            :columns="volumeColumns"
            :rows="sortedVolumeRows"
            :sort="sortStates.volume"
            :default-sort="defaultSorts.volume"
            @sort-change="(key) => onSortChange('volume', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Revenue and RPM Trend"
        subtitle="Revenue and RPM over time"
        @open-info="openInfo('revenue')"
        @export-csv="exportReportCsv('revenue', revenueColumns, sortedRevenueRows)"
      >
        <VChart class="h-64 w-full" :option="revenueChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('revenue')"
          >
            {{ detailsOpen.revenue ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.revenue" class="mt-3">
          <SortableReportTable
            :columns="revenueColumns"
            :rows="sortedRevenueRows"
            :sort="sortStates.revenue"
            :default-sort="defaultSorts.revenue"
            @sort-change="(key) => onSortChange('revenue', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Status Pipeline by Account Manager"
        subtitle="Stacked status distribution by manager"
        @open-info="openInfo('pipeline')"
        @export-csv="exportReportCsv('pipeline', pipelineColumns, sortedPipelineRows)"
      >
        <div class="mb-2 flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          <span>Top AMs in chart</span>
          <select
            v-model.number="pipelineTopN"
            class="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option :value="8">8</option>
            <option :value="12">12</option>
            <option :value="20">20</option>
          </select>
        </div>

        <VChart class="h-64 w-full" :option="pipelineChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('pipeline')"
          >
            {{ detailsOpen.pipeline ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.pipeline" class="mt-3">
          <SortableReportTable
            :columns="pipelineColumns"
            :rows="sortedPipelineRows"
            :sort="sortStates.pipeline"
            :default-sort="defaultSorts.pipeline"
            @sort-change="(key) => onSortChange('pipeline', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Customer Performance Leaderboard"
        subtitle="Ranking customers by output and quality"
        @open-info="openInfo('customer')"
        @export-csv="exportReportCsv('customer', customerColumns, sortedCustomerRows)"
      >
        <div class="mb-2 flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          <span>Top customers in chart</span>
          <select
            v-model.number="customerTopN"
            class="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>

        <VChart class="h-64 w-full" :option="customerChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('customer')"
          >
            {{ detailsOpen.customer ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.customer" class="mt-3">
          <SortableReportTable
            :columns="customerColumns"
            :rows="sortedCustomerRows"
            :sort="sortStates.customer"
            :default-sort="defaultSorts.customer"
            @sort-change="(key) => onSortChange('customer', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Account Manager Scorecard"
        subtitle="Performance scorecard by account manager"
        @open-info="openInfo('am')"
        @export-csv="exportReportCsv('am', accountManagerColumns, sortedAccountManagerRows)"
      >
        <div class="mb-2 flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          <span>Top AMs in chart</span>
          <select
            v-model.number="accountManagerTopN"
            class="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>

        <VChart class="h-64 w-full" :option="accountManagerChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('am')"
          >
            {{ detailsOpen.am ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.am" class="mt-3">
          <SortableReportTable
            :columns="accountManagerColumns"
            :rows="sortedAccountManagerRows"
            :sort="sortStates.am"
            :default-sort="defaultSorts.am"
            @sort-change="(key) => onSortChange('am', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Lane Performance"
        subtitle="Top lanes by load count and rate quality"
        @open-info="openInfo('lane')"
        @export-csv="exportReportCsv('lane', laneColumns, sortedLaneRows)"
      >
        <div class="mb-2 flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          <span>Top lanes in chart</span>
          <select
            v-model.number="laneTopN"
            class="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
        </div>

        <VChart class="h-64 w-full" :option="laneChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('lane')"
          >
            {{ detailsOpen.lane ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.lane" class="mt-3">
          <SortableReportTable
            :columns="laneColumns"
            :rows="sortedLaneRows"
            :sort="sortStates.lane"
            :default-sort="defaultSorts.lane"
            @sort-change="(key) => onSortChange('lane', key)"
          />
        </div>
      </ReportCard>

      <ReportCard
        title="Exception and Reason Analysis"
        subtitle="Delayed, canceled, and TONU records"
        @open-info="openInfo('exception')"
        @export-csv="exportReportCsv('exception', exceptionColumns, sortedExceptionRows)"
      >
        <template #header-actions>
          <div class="flex items-center overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              class="px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
              :class="
                exceptionChartView === 'account_manager'
                  ? 'bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
              "
              @click="exceptionChartView = 'account_manager'"
            >
              By Account Manager
            </button>
            <button
              type="button"
              class="border-l border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest dark:border-zinc-700"
              :class="
                exceptionChartView === 'dispatcher'
                  ? 'bg-zinc-700 text-white dark:bg-zinc-200 dark:text-zinc-900'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'
              "
              @click="exceptionChartView = 'dispatcher'"
            >
              By Dispatcher
            </button>
          </div>
        </template>

        <VChart class="h-64 w-full" :option="exceptionChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('exception')"
          >
            {{ detailsOpen.exception ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.exception" class="mt-3">
          <SortableReportTable
            :columns="exceptionColumns"
            :rows="sortedExceptionRows"
            :sort="sortStates.exception"
            :default-sort="defaultSorts.exception"
            @sort-change="(key) => onSortChange('exception', key)"
          >
            <template #cell-status="{ value }">
              <span :class="statusBadge(String(value))">{{ value }}</span>
            </template>
          </SortableReportTable>
        </div>
      </ReportCard>

      <ReportCard
        title="Aging Pipeline"
        subtitle="Open loads by age bucket"
        @open-info="openInfo('aging')"
        @export-csv="exportReportCsv('aging', agingColumns, sortedAgingRows)"
      >
        <VChart class="h-64 w-full" :option="agingChartOption" autoresize />

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="toggleDetails('aging')"
          >
            {{ detailsOpen.aging ? 'Hide Details' : 'Details' }}
          </button>
        </div>

        <div v-if="detailsOpen.aging" class="mt-3">
          <SortableReportTable
            :columns="agingColumns"
            :rows="sortedAgingRows"
            :sort="sortStates.aging"
            :default-sort="defaultSorts.aging"
            @sort-change="(key) => onSortChange('aging', key)"
          >
            <template #cell-status="{ value }">
              <span :class="statusBadge(String(value))">{{ value }}</span>
            </template>
          </SortableReportTable>
        </div>
      </ReportCard>

      <ReportCard
        title="Detailed Load Ledger"
        subtitle="Row-level operational report"
        card-class="xl:col-span-2"
        @open-info="openInfo('ledger')"
        @export-csv="exportReportCsv('ledger', ledgerColumns, visibleLedgerRows)"
      >
        <div class="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          <span>Detailed table sorted by selected column</span>
          <div class="flex items-center gap-2">
            <span>Show</span>
            <select
              v-model="ledgerLimit"
              class="rounded border border-zinc-300 px-1 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        <SortableReportTable
          :columns="ledgerColumns"
          :rows="visibleLedgerRows"
          :sort="sortStates.ledger"
          :default-sort="defaultSorts.ledger"
          @sort-change="(key) => onSortChange('ledger', key)"
        >
          <template #cell-status="{ value }">
            <span :class="statusBadge(String(value))">{{ value }}</span>
          </template>
        </SortableReportTable>
      </ReportCard>
    </div>

    <ReportInfoModal :open="Boolean(activeInfo)" :info="activeInfo" @close="activeInfo = null" />
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { LOAD_STATUSES, type LoadStatus } from '@antigravity/shared';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { CustomerRecord, LoadRecord, SessionUser, UserRecord } from '@/types/models';
import ReportCard from '@/components/reports/ReportCard.vue';
import ReportInfoModal from '@/components/reports/ReportInfoModal.vue';
import ReportsFilterBar from '@/components/reports/ReportsFilterBar.vue';
import SortableReportTable from '@/components/reports/SortableReportTable.vue';
import { downloadCsv } from '@/components/reports/reportExport';
import {
  EXCEPTION_STATUSES,
  OPEN_PIPELINE_STATUSES,
  applyGlobalFilters,
  createDefaultReportsGlobalFilters,
  cycleSortState,
  formatCurrencyValue,
  formatGroupedDateKey,
  formatNumberValue,
  formatPercentValue,
  formatStatusLabel,
  getAgeBucket,
  getAgeDays,
  getLoadDateKey,
  getReasonText,
  groupLoadsByDate,
  maxDateKey,
  sortRows,
  toNumber,
  type ReportInfoDefinition,
  type ReportsGlobalFilters,
  type ReportSortState,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/reports/reportHelpers';

use([CanvasRenderer, PieChart, LineChart, BarChart, TooltipComponent, LegendComponent, GridComponent]);

type ReportId = 'kpi' | 'volume' | 'revenue' | 'pipeline' | 'customer' | 'am' | 'lane' | 'exception' | 'aging' | 'ledger';

const props = defineProps<{
  loads: LoadRecord[];
  customers: CustomerRecord[];
  users: UserRecord[];
  currentUser: SessionUser | null;
  isRefreshing?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const statusOptions = [...LOAD_STATUSES] as LoadStatus[];

const filters = ref<ReportsGlobalFilters>(createDefaultReportsGlobalFilters());
const lastUpdated = ref(new Date());

watch(
  () => props.loads,
  () => {
    lastUpdated.value = new Date();
  },
  { deep: false },
);

const lastUpdatedLabel = computed(() =>
  lastUpdated.value.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
);

const customerTopN = ref(10);
const accountManagerTopN = ref(10);
const laneTopN = ref(10);
const pipelineTopN = ref(12);
const ledgerLimit = ref<'100' | '250' | 'all'>('100');
const exceptionChartView = ref<'account_manager' | 'dispatcher'>('account_manager');

const ACCOUNT_MANAGER_COLORS = [
  '#2563eb',
  '#f97316',
  '#16a34a',
  '#dc2626',
  '#0891b2',
  '#9333ea',
  '#ca8a04',
  '#0f766e',
  '#be185d',
  '#4f46e5',
  '#65a30d',
  '#b45309',
  '#0ea5e9',
  '#ef4444',
  '#22c55e',
  '#6366f1',
  '#eab308',
  '#14b8a6',
  '#ec4899',
  '#8b5cf6',
  '#059669',
  '#f59e0b',
  '#0284c7',
  '#84cc16',
];

const customerTypeByName = computed(() => {
  const map = new Map<string, string>();

  for (const customer of props.customers) {
    map.set(customer.name.trim().toLowerCase(), customer.type);
  }

  return map;
});

const customerTypeOptions = computed(() =>
  [...new Set(props.customers.map((customer) => customer.type))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const customerOptions = computed(() =>
  [...new Set(props.loads.map((load) => load.customer_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const accountManagerOptions = computed(() =>
  [...new Set(props.loads.map((load) => load.account_manager_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const dispatcherOptions = computed(() =>
  [...new Set(props.loads.map((load) => load.dispatcher_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const driverOptions = computed(() =>
  [...new Set(props.loads.map((load) => load.driver_name).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const truckOptions = computed(() =>
  [...new Set(props.loads.map((load) => load.truck_number).filter(Boolean) as string[])].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  ),
);

const filteredLoads = computed(() =>
  applyGlobalFilters(props.loads, filters.value, {
    customerTypeByName: customerTypeByName.value,
  }),
);

const statusesPresent = computed<LoadStatus[]>(() => {
  const used = new Set<LoadStatus>();
  for (const load of filteredLoads.value) {
    used.add(load.status);
  }

  return statusOptions.filter((status) => used.has(status));
});

const defaultSorts: Record<ReportId, ReportSortState | null> = {
  kpi: { key: 'metric', direction: 'asc' },
  volume: { key: 'date', direction: 'desc' },
  revenue: { key: 'date', direction: 'desc' },
  pipeline: { key: 'account_manager', direction: 'asc' },
  customer: { key: 'revenue', direction: 'desc' },
  am: { key: 'revenue', direction: 'desc' },
  lane: { key: 'load_count', direction: 'desc' },
  exception: { key: 'date', direction: 'desc' },
  aging: { key: 'age_days', direction: 'desc' },
  ledger: { key: 'date', direction: 'desc' },
};

const sortStates = reactive<Record<ReportId, ReportSortState | null>>({
  kpi: null,
  volume: null,
  revenue: null,
  pipeline: null,
  customer: null,
  am: null,
  lane: null,
  exception: null,
  aging: null,
  ledger: null,
});

const detailsOpen = reactive<Record<ReportId, boolean>>({
  kpi: false,
  volume: false,
  revenue: false,
  pipeline: false,
  customer: false,
  am: false,
  lane: false,
  exception: false,
  aging: false,
  ledger: true,
});

function onSortChange(reportId: ReportId, key: string): void {
  sortStates[reportId] = cycleSortState(sortStates[reportId], key);
}

function toggleDetails(reportId: ReportId): void {
  detailsOpen[reportId] = !detailsOpen[reportId];
}

const reportInfos: Record<ReportId, ReportInfoDefinition> = {
  kpi: {
    id: 'kpi',
    title: 'Executive KPI Overview',
    what: 'This report summarizes total load volume, delivered count, revenue, average RPM, and the exception rate for the records currently in view.',
    logic:
      'Total loads and delivered loads are simple counts. Revenue is the sum of rate from filtered loads. Average RPM is the average RPM from filtered loads. Exception rate is delayed + canceled + TONU divided by total loads.',
    filters:
      'Time filters, order filters, and users filters all apply before metrics are calculated.',
  },
  volume: {
    id: 'volume',
    title: 'Load Volume Trend',
    what: 'This report shows how many loads are present per day, split by status.',
    logic:
      'Loads are grouped by the selected date field (pickup, delivery, or created date) and Group By period. Each status gets its own line with counts per period.',
    filters:
      'Global filters apply before grouping. Status filter limits which loads are counted. Date field selection changes the timeline grouping.',
  },
  revenue: {
    id: 'revenue',
    title: 'Revenue and RPM Trend',
    what: 'This report tracks revenue and average RPM over time so you can compare financial output and efficiency.',
    logic:
      'For each period, revenue is sum(rate) of filtered loads. Avg RPM is the average RPM of filtered loads in that same period.',
    filters:
      'Time, order, and users filters directly drive the chart and table values.',
  },
  pipeline: {
    id: 'pipeline',
    title: 'Status Pipeline by Account Manager',
    what: 'This report compares status distribution per account manager.',
    logic:
      'Each account manager row counts loads by status. Total, open count, delivered count, and exception count are derived from those status totals.',
    filters:
      'Global filters are applied first. The chart can also be limited to Top N account managers for readability.',
  },
  customer: {
    id: 'customer',
    title: 'Customer Performance Leaderboard',
    what: 'This report ranks customers by volume, delivered count, revenue, RPM, and exceptions.',
    logic:
      'Data is grouped by customer. Revenue uses filtered loads. Exception rate is exception loads divided by customer load count.',
    filters:
      'Global filters affect all customer metrics. Chart view is limited by Top N.',
  },
  am: {
    id: 'am',
    title: 'Account Manager Scorecard',
    what: 'This report ranks account managers by operational output and outcomes.',
    logic:
      'Data is grouped by account manager with total loads, delivered loads, revenue, average RPM, and exception rate.',
    filters:
      'Global filters affect all scorecard values. Chart is limited by Top N setting.',
  },
  lane: {
    id: 'lane',
    title: 'Lane Performance',
    what: 'This report highlights lanes with the highest activity and summarizes their rate/mileage characteristics.',
    logic:
      'A lane is pickup city/state to delivery city/state. For each lane we compute load count, average rate, average miles, average RPM, and last activity date.',
    filters:
      'Global filters define which loads are included. Chart is limited by Top N lanes.',
  },
  exception: {
    id: 'exception',
    title: 'Exception and Reason Analysis',
    what: 'This report focuses on delayed, canceled, and TONU loads with the reasons recorded for those exceptions.',
    logic:
      'Only statuses DELAYED, CANCELED, and TONU are included. The chart groups exception order counts by Account Manager or Dispatcher. The details table keeps reason-level rows.',
    filters:
      'Global filters affect which exceptions remain in scope and the owner counts shown in the chart.',
  },
  aging: {
    id: 'aging',
    title: 'Aging Pipeline',
    what: 'This report shows how old open pipeline loads are, both by bucket and detail rows.',
    logic:
      'Age is days since created date. Buckets are 0-2, 3-7, 8-14, and 15+ days. Only open pipeline statuses are included.',
    filters:
      'Global filters reduce the open loads first, then bucket counts and details are computed.',
  },
  ledger: {
    id: 'ledger',
    title: 'Detailed Load Ledger',
    what: 'This is the row-level operational table for direct review and export.',
    logic:
      'Each row is a load with selected date field, customer, account manager, dispatcher, status, rate, miles, RPM, ref, and route.',
    filters:
      'All global filters apply. Sorting and row limit controls change what is visible and exported.',
  },
};

const activeInfo = ref<ReportInfoDefinition | null>(null);

function openInfo(reportId: ReportId): void {
  activeInfo.value = reportInfos[reportId];
}

function updateFilters(next: ReportsGlobalFilters): void {
  filters.value = next;
}

function resetFilters(): void {
  filters.value = createDefaultReportsGlobalFilters();
}

function statusKey(status: LoadStatus): string {
  return `status_${status}`;
}

function routeLabel(load: LoadRecord): string {
  return `${load.pu_city}, ${load.pu_state} -> ${load.del_city}, ${load.del_state}`;
}

function exportReportCsv(reportId: ReportId, columns: ReportTableColumn[], rows: ReportTableRow[]): void {
  downloadCsv(reportId, columns, rows);
}

function buildDeterministicColorMap(values: string[]): Map<string, string> {
  const unique = [...new Set(values)].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  const map = new Map<string, string>();

  unique.forEach((value, index) => {
    map.set(value, ACCOUNT_MANAGER_COLORS[index % ACCOUNT_MANAGER_COLORS.length]);
  });

  return map;
}

function compareRevenueThenNameDesc(left: ReportTableRow, right: ReportTableRow, nameKey: string): number {
  const revenueDiff = toNumber(right.revenue) - toNumber(left.revenue);
  if (revenueDiff !== 0) {
    return revenueDiff;
  }

  return String(right[nameKey] ?? '').localeCompare(String(left[nameKey] ?? ''), undefined, { sensitivity: 'base' });
}

function statusLabelWithLoads(status: LoadStatus): string {
  const lower = formatStatusLabel(status).toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)} loads`;
}

function statusBadge(status: string): string {
  if (status === 'DELIVERED' || status === 'BROKERAGE') {
    return 'rounded px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (status === 'DELAYED' || status === 'CANCELED' || status === 'TONU') {
    return 'rounded px-2 py-1 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }

  if (status === 'PENDING_APPROVAL' || status === 'QUOTE_SUBMITTED') {
    return 'rounded px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }

  return 'rounded px-2 py-1 text-[10px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200';
}

function formatCurrencyWhole(value: number): string {
  return `$${Math.round(toNumber(value)).toLocaleString()}`;
}

const kpiMetrics = computed(() => {
  const totalLoads = filteredLoads.value.length;
  const deliveredLoads = filteredLoads.value.filter((load) => load.status === 'DELIVERED').length;
  const revenueLoads = filteredLoads.value;
  const revenue = revenueLoads.reduce((sum, load) => sum + toNumber(load.rate), 0);
  const avgRpm = revenueLoads.length > 0 ? revenueLoads.reduce((sum, load) => sum + toNumber(load.rpm), 0) / revenueLoads.length : 0;
  const exceptionCount = filteredLoads.value.filter((load) => EXCEPTION_STATUSES.includes(load.status)).length;
  const exceptionRate = totalLoads > 0 ? (exceptionCount / totalLoads) * 100 : 0;

  return {
    totalLoads,
    deliveredLoads,
    revenue,
    avgRpm,
    exceptionRate,
  };
});

const kpiColumns: ReportTableColumn[] = [
  { key: 'metric', label: 'Metric', sortable: true },
  { key: 'value_display', label: 'Value', sortable: true },
  { key: 'logic', label: 'Logic', sortable: false },
];

const kpiRows = computed<ReportTableRow[]>(() => [
  {
    id: 'total_loads',
    metric: 'Total Loads',
    value_display: formatNumberValue(kpiMetrics.value.totalLoads),
    logic: 'Count of all loads after filters.',
  },
  {
    id: 'delivered_loads',
    metric: 'Delivered Loads',
    value_display: formatNumberValue(kpiMetrics.value.deliveredLoads),
    logic: 'Count where status is DELIVERED.',
  },
  {
    id: 'revenue',
    metric: 'Revenue',
    value_display: formatCurrencyValue(kpiMetrics.value.revenue),
    logic: 'Sum of rate for filtered loads.',
  },
  {
    id: 'avg_rpm',
    metric: 'Average RPM',
    value_display: formatCurrencyValue(kpiMetrics.value.avgRpm),
    logic: 'Average RPM over filtered loads.',
  },
  {
    id: 'exception_rate',
    metric: 'Exception Rate',
    value_display: formatPercentValue(kpiMetrics.value.exceptionRate),
    logic: 'Delayed + Canceled + TONU divided by total loads.',
  },
]);

const sortedKpiRows = computed(() => sortRows(kpiRows.value, sortStates.kpi, defaultSorts.kpi));

const statusDistribution = computed(() => {
  const grouped = new Map<LoadStatus, number>();

  for (const load of filteredLoads.value) {
    grouped.set(load.status, (grouped.get(load.status) ?? 0) + 1);
  }

  return [...grouped.entries()].sort((left, right) => right[1] - left[1]);
});

const statusRevenueMap = computed(() => {
  const grouped = new Map<LoadStatus, number>();

  for (const load of filteredLoads.value) {
    grouped.set(load.status, (grouped.get(load.status) ?? 0) + toNumber(load.rate));
  }

  return grouped;
});

const kpiChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => {
      const status = String(params?.data?.status ?? '');
      const count = toNumber(params?.value);
      const revenue = toNumber(params?.data?.revenue);

      return [
        formatStatusLabel(status),
        `Orders: ${formatNumberValue(count)}`,
        `Revenue: ${formatCurrencyWhole(revenue)}`,
      ].join('<br/>');
    },
  },
  legend: { type: 'scroll', orient: 'vertical', left: 0, top: 'middle' },
  series: [
    {
      type: 'pie',
      center: ['66%', '50%'],
      radius: ['36%', '68%'],
      label: {
        formatter: '{b}: {d}%',
      },
      data: statusDistribution.value.map(([status, count]) => ({
        status,
        name: formatStatusLabel(status),
        value: count,
        revenue: statusRevenueMap.value.get(status) ?? 0,
      })),
    },
  ],
}));

const volumeRows = computed<ReportTableRow[]>(() => {
  const grouped = groupLoadsByDate(filteredLoads.value, filters.value.dateDimension, filters.value.dateGroupBy);
  const dateKeys = [...grouped.keys()].sort((left, right) => left.localeCompare(right));

  return dateKeys.map((dateKey) => {
    const dayLoads = grouped.get(dateKey) ?? [];
    const row: ReportTableRow = {
      id: dateKey,
      date: dateKey,
      total: dayLoads.length,
    };

    for (const status of statusesPresent.value) {
      row[statusKey(status)] = 0;
    }

    for (const load of dayLoads) {
      const key = statusKey(load.status);
      row[key] = toNumber(row[key]) + 1;
    }

    return row;
  });
});

const volumeColumns = computed<ReportTableColumn[]>(() => [
  { key: 'date', label: 'Period', sortable: true, format: 'date' },
  { key: 'total', label: 'Total', sortable: true, align: 'right', format: 'number' },
  ...statusesPresent.value.map((status) => ({
    key: statusKey(status),
    label: formatStatusLabel(status),
    sortable: true,
    align: 'right' as const,
    format: 'number' as const,
  })),
]);

const sortedVolumeRows = computed(() => sortRows(volumeRows.value, sortStates.volume, defaultSorts.volume));

const volumeRowsForChart = computed(() => [...volumeRows.value].sort((left, right) => String(left.date).localeCompare(String(right.date))));

const volumeLegendRows = computed(() => {
  const labels = statusesPresent.value.map((status) => formatStatusLabel(status));
  const splitAt = Math.ceil(labels.length / 2);
  return [labels.slice(0, splitAt), labels.slice(splitAt)].filter((row) => row.length > 0);
});

const volumeChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: volumeLegendRows.value.map((legendRow, index) => ({
    type: 'plain',
    left: 'center',
    bottom: index === 0 ? 26 : 6,
    data: legendRow,
  })),
  grid: { top: 18, right: 18, left: 42, bottom: 86 },
  xAxis: {
    type: 'category',
    data: volumeRowsForChart.value.map((row) => formatGroupedDateKey(String(row.date), filters.value.dateGroupBy)),
  },
  yAxis: {
    type: 'value',
    name: 'Loads',
  },
  series: statusesPresent.value.map((status) => ({
    name: formatStatusLabel(status),
    type: 'line',
    smooth: true,
    areaStyle: { opacity: 0.07 },
    data: volumeRowsForChart.value.map((row) => toNumber(row[statusKey(status)])),
  })),
}));

const revenueColumns: ReportTableColumn[] = [
  { key: 'date', label: 'Period', sortable: true, format: 'date' },
  { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', format: 'currency' },
  { key: 'avg_rpm', label: 'Avg RPM', sortable: true, align: 'right', format: 'currency' },
  { key: 'load_count', label: 'Loads', sortable: true, align: 'right', format: 'number' },
];

const revenueRows = computed<ReportTableRow[]>(() => {
  const grouped = groupLoadsByDate(filteredLoads.value, filters.value.dateDimension, filters.value.dateGroupBy);
  const dateKeys = [...grouped.keys()].sort((left, right) => left.localeCompare(right));

  return dateKeys.map((dateKey) => {
    const dayLoads = grouped.get(dateKey) ?? [];
    const revenueLoads = dayLoads;
    const revenue = revenueLoads.reduce((sum, load) => sum + toNumber(load.rate), 0);
    const avgRpm = revenueLoads.length > 0 ? revenueLoads.reduce((sum, load) => sum + toNumber(load.rpm), 0) / revenueLoads.length : 0;

    return {
      id: dateKey,
      date: dateKey,
      revenue,
      avg_rpm: avgRpm,
      load_count: revenueLoads.length,
    };
  });
});

const sortedRevenueRows = computed(() => sortRows(revenueRows.value, sortStates.revenue, defaultSorts.revenue));

const revenueRowsForChart = computed(() => [...revenueRows.value].sort((left, right) => String(left.date).localeCompare(String(right.date))));

const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      const axisLabel = String(items[0]?.axisValueLabel ?? items[0]?.axisValue ?? '');
      const revenue = toNumber(items.find((item: any) => item.seriesName === 'Revenue')?.value);
      const avgRpm = toNumber(items.find((item: any) => item.seriesName === 'Avg RPM')?.value);

      return [axisLabel, `Revenue: ${formatCurrencyWhole(revenue)}`, `Avg RPM: ${formatCurrencyValue(avgRpm)}`].join('<br/>');
    },
  },
  legend: { top: 0 },
  grid: { top: 38, right: 36, left: 52, bottom: 30 },
  xAxis: {
    type: 'category',
    data: revenueRowsForChart.value.map((row) => formatGroupedDateKey(String(row.date), filters.value.dateGroupBy)),
  },
  yAxis: [
    {
      type: 'value',
      name: 'Revenue',
      axisLabel: {
        formatter: (value: number) => `$${value.toLocaleString()}`,
      },
    },
    {
      type: 'value',
      name: 'Avg RPM',
      axisLabel: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    },
  ],
  series: [
    {
      name: 'Revenue',
      type: 'bar',
      yAxisIndex: 0,
      data: revenueRowsForChart.value.map((row) => toNumber(row.revenue)),
    },
    {
      name: 'Avg RPM',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: revenueRowsForChart.value.map((row) => toNumber(row.avg_rpm)),
    },
  ],
}));

const pipelineColumns: ReportTableColumn[] = [
  { key: 'account_manager', label: 'Account Manager', sortable: true },
  { key: 'total', label: 'Total', sortable: true, align: 'right', format: 'number' },
  { key: 'open_count', label: 'Open', sortable: true, align: 'right', format: 'number' },
  { key: 'delivered_count', label: 'Delivered', sortable: true, align: 'right', format: 'number' },
  { key: 'exception_count', label: 'Exceptions', sortable: true, align: 'right', format: 'number' },
  { key: 'last_activity_date', label: 'Last Activity', sortable: true, format: 'date' },
];

const pipelineRows = computed<ReportTableRow[]>(() => {
  const grouped = new Map<string, ReportTableRow>();

  for (const load of filteredLoads.value) {
    const managerName = load.account_manager_name?.trim() || 'Unassigned';
    const row = grouped.get(managerName) ?? {
      id: managerName,
      account_manager: managerName,
      total: 0,
      open_count: 0,
      delivered_count: 0,
      exception_count: 0,
      last_activity_date: '',
    };

    row.total = toNumber(row.total) + 1;

    if (OPEN_PIPELINE_STATUSES.includes(load.status)) {
      row.open_count = toNumber(row.open_count) + 1;
    }

    if (load.status === 'DELIVERED') {
      row.delivered_count = toNumber(row.delivered_count) + 1;
    }

    if (EXCEPTION_STATUSES.includes(load.status)) {
      row.exception_count = toNumber(row.exception_count) + 1;
    }

    const dateKey = getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at');
    row.last_activity_date = maxDateKey([String(row.last_activity_date ?? ''), dateKey]);

    for (const status of statusOptions) {
      const key = statusKey(status);
      if (row[key] === undefined) {
        row[key] = 0;
      }
    }

    row[statusKey(load.status)] = toNumber(row[statusKey(load.status)]) + 1;

    grouped.set(managerName, row);
  }

  return [...grouped.values()];
});

const sortedPipelineRows = computed(() => sortRows(pipelineRows.value, sortStates.pipeline, defaultSorts.pipeline));

const pipelineRowsForChart = computed(() =>
  [...pipelineRows.value]
    .sort((left, right) => toNumber(right.total) - toNumber(left.total))
    .slice(0, pipelineTopN.value),
);

const pipelineStatusesForChart = computed<LoadStatus[]>(() => {
  const included: LoadStatus[] = [];

  for (const status of statusOptions) {
    const key = statusKey(status);
    if (pipelineRowsForChart.value.some((row) => toNumber(row[key]) > 0)) {
      included.push(status);
    }
  }

  return included;
});

const pipelineChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { type: 'scroll', orient: 'vertical', left: 0, top: 'middle' },
  grid: { top: 20, right: 18, left: 170, bottom: 44 },
  xAxis: {
    type: 'category',
    axisLabel: { interval: 0, rotate: 25 },
    data: pipelineRowsForChart.value.map((row) => String(row.account_manager)),
  },
  yAxis: { type: 'value', name: 'Loads' },
  series: pipelineStatusesForChart.value.map((status) => ({
    name: formatStatusLabel(status),
    type: 'bar',
    stack: 'total',
    data: pipelineRowsForChart.value.map((row) => toNumber(row[statusKey(status)])),
  })),
}));

const customerColumns: ReportTableColumn[] = [
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'load_count', label: 'Loads', sortable: true, align: 'right', format: 'number' },
  { key: 'delivered_count', label: 'Delivered', sortable: true, align: 'right', format: 'number' },
  { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', format: 'currency' },
  { key: 'avg_rpm', label: 'Avg RPM', sortable: true, align: 'right', format: 'currency' },
  { key: 'exception_rate', label: 'Exception Rate', sortable: true, align: 'right', format: 'percent' },
  { key: 'last_activity_date', label: 'Last Activity', sortable: true, format: 'date' },
];

const customerRows = computed<ReportTableRow[]>(() => {
  const grouped = new Map<string, ReportTableRow>();

  for (const load of filteredLoads.value) {
    const customer = load.customer_name?.trim() || 'Unknown Customer';
    const row = grouped.get(customer) ?? {
      id: customer,
      customer,
      load_count: 0,
      delivered_count: 0,
      revenue: 0,
      rpm_total: 0,
      rpm_count: 0,
      exception_count: 0,
      exception_rate: 0,
      avg_rpm: 0,
      last_activity_date: '',
    };

    row.load_count = toNumber(row.load_count) + 1;

    if (load.status === 'DELIVERED') {
      row.delivered_count = toNumber(row.delivered_count) + 1;
    }

    row.revenue = toNumber(row.revenue) + toNumber(load.rate);
    row.rpm_total = toNumber(row.rpm_total) + toNumber(load.rpm);
    row.rpm_count = toNumber(row.rpm_count) + 1;

    if (EXCEPTION_STATUSES.includes(load.status)) {
      row.exception_count = toNumber(row.exception_count) + 1;
    }

    const dateKey = getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at');
    row.last_activity_date = maxDateKey([String(row.last_activity_date ?? ''), dateKey]);

    grouped.set(customer, row);
  }

  for (const row of grouped.values()) {
    const loadCount = toNumber(row.load_count);
    const exceptionCount = toNumber(row.exception_count);
    row.avg_rpm = toNumber(row.rpm_count) > 0 ? toNumber(row.rpm_total) / toNumber(row.rpm_count) : 0;
    row.exception_rate = loadCount > 0 ? (exceptionCount / loadCount) * 100 : 0;
  }

  return [...grouped.values()];
});

const sortedCustomerRows = computed(() => {
  if (sortStates.customer) {
    return sortRows(customerRows.value, sortStates.customer, null);
  }

  return [...customerRows.value].sort((left, right) => compareRevenueThenNameDesc(left, right, 'customer'));
});

const customerRowsForChart = computed(() =>
  [...customerRows.value]
    .sort((left, right) => compareRevenueThenNameDesc(left, right, 'customer'))
    .slice(0, customerTopN.value),
);

const customerChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 16, right: 20, left: 170, bottom: 24 },
  xAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value: number) => `$${value.toLocaleString()}`,
    },
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: customerRowsForChart.value.map((row) => String(row.customer)),
  },
  series: [
    {
      type: 'bar',
      data: customerRowsForChart.value.map((row) => toNumber(row.revenue)),
    },
  ],
}));

const accountManagerColumns: ReportTableColumn[] = [
  { key: 'account_manager', label: 'Account Manager', sortable: true },
  { key: 'load_count', label: 'Loads', sortable: true, align: 'right', format: 'number' },
  { key: 'delivered_count', label: 'Delivered', sortable: true, align: 'right', format: 'number' },
  { key: 'revenue', label: 'Revenue', sortable: true, align: 'right', format: 'currency' },
  { key: 'avg_rpm', label: 'Avg RPM', sortable: true, align: 'right', format: 'currency' },
  { key: 'exception_rate', label: 'Exception Rate', sortable: true, align: 'right', format: 'percent' },
  { key: 'last_activity_date', label: 'Last Activity', sortable: true, format: 'date' },
];

const accountManagerRows = computed<ReportTableRow[]>(() => {
  const grouped = new Map<string, ReportTableRow>();

  for (const load of filteredLoads.value) {
    const accountManager = load.account_manager_name?.trim() || 'Unassigned';
    const row = grouped.get(accountManager) ?? {
      id: accountManager,
      account_manager: accountManager,
      load_count: 0,
      delivered_count: 0,
      revenue: 0,
      rpm_total: 0,
      rpm_count: 0,
      exception_count: 0,
      exception_rate: 0,
      avg_rpm: 0,
      last_activity_date: '',
    };

    row.load_count = toNumber(row.load_count) + 1;

    if (load.status === 'DELIVERED') {
      row.delivered_count = toNumber(row.delivered_count) + 1;
    }

    row.revenue = toNumber(row.revenue) + toNumber(load.rate);
    row.rpm_total = toNumber(row.rpm_total) + toNumber(load.rpm);
    row.rpm_count = toNumber(row.rpm_count) + 1;

    if (EXCEPTION_STATUSES.includes(load.status)) {
      row.exception_count = toNumber(row.exception_count) + 1;
    }

    const dateKey = getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at');
    row.last_activity_date = maxDateKey([String(row.last_activity_date ?? ''), dateKey]);

    grouped.set(accountManager, row);
  }

  for (const row of grouped.values()) {
    const loadCount = toNumber(row.load_count);
    row.avg_rpm = toNumber(row.rpm_count) > 0 ? toNumber(row.rpm_total) / toNumber(row.rpm_count) : 0;
    row.exception_rate = loadCount > 0 ? (toNumber(row.exception_count) / loadCount) * 100 : 0;
  }

  return [...grouped.values()];
});

const sortedAccountManagerRows = computed(() => sortRows(accountManagerRows.value, sortStates.am, defaultSorts.am));

const accountManagerRowsForChart = computed(() =>
  [...accountManagerRows.value]
    .sort((left, right) => toNumber(right.revenue) - toNumber(left.revenue))
    .slice(0, accountManagerTopN.value),
);

const accountManagerChartLabels = computed(() => accountManagerRowsForChart.value.map((row) => String(row.account_manager)));
const accountManagerColorMap = computed(() => buildDeterministicColorMap(accountManagerChartLabels.value));
const accountManagerChartRowMap = computed(() => {
  const map = new Map<string, ReportTableRow>();
  for (const row of accountManagerRowsForChart.value) {
    map.set(String(row.account_manager), row);
  }
  return map;
});

const accountManagerChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      const selected = items.find((item: any) => toNumber(item.value) > 0) ?? items[0];
      const dataIndex = Number(selected?.dataIndex ?? items[0]?.dataIndex ?? 0);
      const manager = accountManagerChartLabels.value[dataIndex] ?? String(selected?.seriesName ?? '');
      const row = accountManagerChartRowMap.value.get(manager);
      const revenue = row ? toNumber(row.revenue) : toNumber(selected?.value);
      const loadCount = row ? Math.max(toNumber(row.load_count), 1) : 1;
      const avgRevenuePerLoad = revenue / loadCount;

      return [
        manager,
        `Revenue: ${formatCurrencyWhole(revenue)}`,
        `Avg Revenue per Load: ${formatCurrencyWhole(avgRevenuePerLoad)}`,
      ].join('<br/>');
    },
  },
  legend: {
    type: 'scroll',
    orient: 'vertical',
    left: 0,
    top: 'middle',
    data: accountManagerChartLabels.value,
  },
  grid: { top: 16, right: 20, left: 220, bottom: 24 },
  xAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value: number) => `$${value.toLocaleString()}`,
    },
  },
  yAxis: {
    type: 'category',
    data: accountManagerChartLabels.value,
  },
  series: accountManagerRowsForChart.value.map((row, rowIndex) => {
    const managerName = String(row.account_manager);
    return {
      name: managerName,
      type: 'bar',
      stack: 'manager_revenue',
      barMaxWidth: 24,
      itemStyle: {
        color: accountManagerColorMap.value.get(managerName) ?? '#2563eb',
      },
      data: accountManagerRowsForChart.value.map((_innerRow, innerIndex) => (innerIndex === rowIndex ? toNumber(row.revenue) : 0)),
    };
  }),
}));

const laneColumns: ReportTableColumn[] = [
  { key: 'lane', label: 'Lane', sortable: true },
  { key: 'load_count', label: 'Loads', sortable: true, align: 'right', format: 'number' },
  { key: 'avg_rate', label: 'Avg Rate', sortable: true, align: 'right', format: 'currency' },
  { key: 'avg_miles', label: 'Avg Miles', sortable: true, align: 'right', format: 'number' },
  { key: 'avg_rpm', label: 'Avg RPM', sortable: true, align: 'right', format: 'currency' },
  { key: 'last_activity_date', label: 'Last Activity', sortable: true, format: 'date' },
];

const laneRows = computed<ReportTableRow[]>(() => {
  const grouped = new Map<string, ReportTableRow>();

  for (const load of filteredLoads.value) {
    const lane = routeLabel(load);
    const row = grouped.get(lane) ?? {
      id: lane,
      lane,
      lane_state_pair: `${load.pu_state} - ${load.del_state}`,
      load_count: 0,
      rate_total: 0,
      revenue: 0,
      miles_total: 0,
      rpm_total: 0,
      avg_rate: 0,
      avg_miles: 0,
      avg_rpm: 0,
      last_activity_date: '',
    };

    row.load_count = toNumber(row.load_count) + 1;
    row.rate_total = toNumber(row.rate_total) + toNumber(load.rate);
    row.revenue = toNumber(row.revenue) + toNumber(load.rate);
    row.miles_total = toNumber(row.miles_total) + toNumber(load.miles);
    row.rpm_total = toNumber(row.rpm_total) + toNumber(load.rpm);

    const dateKey = getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at');
    row.last_activity_date = maxDateKey([String(row.last_activity_date ?? ''), dateKey]);

    grouped.set(lane, row);
  }

  for (const row of grouped.values()) {
    const count = Math.max(toNumber(row.load_count), 1);
    row.avg_rate = toNumber(row.rate_total) / count;
    row.avg_miles = toNumber(row.miles_total) / count;
    row.avg_rpm = toNumber(row.rpm_total) / count;
  }

  return [...grouped.values()];
});

const sortedLaneRows = computed(() => sortRows(laneRows.value, sortStates.lane, defaultSorts.lane));

const laneRowsForChart = computed(() =>
  [...laneRows.value]
    .sort((left, right) => toNumber(right.load_count) - toNumber(left.load_count))
    .slice(0, laneTopN.value),
);

const laneChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      const dataIndex = Number(items[0]?.dataIndex ?? 0);
      const row = laneRowsForChart.value[dataIndex];
      if (!row) {
        return '';
      }

      return [
        String(row.lane),
        `Orders: ${formatNumberValue(toNumber(row.load_count))}`,
        `Revenue: ${formatCurrencyWhole(toNumber(row.revenue))}`,
      ].join('<br/>');
    },
  },
  grid: { top: 22, right: 20, left: 52, bottom: 44 },
  xAxis: {
    type: 'category',
    axisLabel: { interval: 0, rotate: 20 },
    data: laneRowsForChart.value.map((row) => String(row.lane_state_pair)),
  },
  yAxis: {
    type: 'value',
    name: 'Loads',
  },
  series: [
    {
      type: 'bar',
      data: laneRowsForChart.value.map((row) => toNumber(row.load_count)),
    },
  ],
}));

const exceptionColumns: ReportTableColumn[] = [
  { key: 'date', label: 'Date', sortable: true, format: 'date' },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'account_manager', label: 'Account Manager', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'reason', label: 'Reason', sortable: true },
  { key: 'load_ref', label: 'Ref #', sortable: true },
];

const exceptionRows = computed<ReportTableRow[]>(() =>
  filteredLoads.value
    .filter((load) => EXCEPTION_STATUSES.includes(load.status))
    .map((load) => ({
      id: load.id,
      date: getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at'),
      customer: load.customer_name || 'Unknown Customer',
      account_manager: load.account_manager_name || 'Unassigned',
      dispatcher: load.dispatcher_name || 'Unassigned',
      status: load.status,
      reason: getReasonText(load),
      load_ref: load.load_ref_number || '—',
    })),
);

const sortedExceptionRows = computed(() => sortRows(exceptionRows.value, sortStates.exception, defaultSorts.exception));

const exceptionOwnerRows = computed(() => {
  const grouped = new Map<string, number>();
  const ownerKey = exceptionChartView.value === 'account_manager' ? 'account_manager' : 'dispatcher';

  for (const row of exceptionRows.value) {
    const owner = String(row[ownerKey] || 'Unassigned');
    grouped.set(owner, (grouped.get(owner) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.owner.localeCompare(right.owner, undefined, { sensitivity: 'base' });
    })
    .slice(0, 12);
});

const exceptionOwnerStatusMap = computed(() => {
  const grouped = new Map<string, { DELAYED: number; CANCELED: number; TONU: number }>();
  const ownerKey = exceptionChartView.value === 'account_manager' ? 'account_manager' : 'dispatcher';

  for (const row of exceptionRows.value) {
    const owner = String(row[ownerKey] || 'Unassigned');
    const status = String(row.status) as LoadStatus;
    const statusCounts = grouped.get(owner) ?? { DELAYED: 0, CANCELED: 0, TONU: 0 };

    if (status === 'DELAYED' || status === 'CANCELED' || status === 'TONU') {
      statusCounts[status] += 1;
    }

    grouped.set(owner, statusCounts);
  }

  return grouped;
});

const exceptionChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      const point = items[0];
      const ownerLabel = exceptionChartView.value === 'account_manager' ? 'Account Manager' : 'Dispatcher';
      const owner = String(point?.axisValueLabel ?? point?.name ?? '');
      const breakdown = exceptionOwnerStatusMap.value.get(owner) ?? { DELAYED: 0, CANCELED: 0, TONU: 0 };

      return [
        `${ownerLabel}: ${owner}`,
        `Orders: ${formatNumberValue(toNumber(point?.value))}`,
        `Delayed: ${formatNumberValue(breakdown.DELAYED)}`,
        `Canceled: ${formatNumberValue(breakdown.CANCELED)}`,
        `TONU: ${formatNumberValue(breakdown.TONU)}`,
      ].join('<br/>');
    },
  },
  grid: { top: 16, right: 20, left: 170, bottom: 24 },
  xAxis: {
    type: 'value',
    name: 'Count',
  },
  yAxis: {
    type: 'category',
    data: exceptionOwnerRows.value.map((row) => row.owner),
  },
  series: [
    {
      type: 'bar',
      data: exceptionOwnerRows.value.map((row) => row.count),
    },
  ],
}));

const agingColumns: ReportTableColumn[] = [
  { key: 'age_bucket', label: 'Age Bucket', sortable: true },
  { key: 'age_days', label: 'Age Days', sortable: true, align: 'right', format: 'number' },
  { key: 'created_date', label: 'Created Date', sortable: true, format: 'date' },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'account_manager', label: 'Account Manager', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'load_ref', label: 'Ref #', sortable: true },
];

const agingRows = computed<ReportTableRow[]>(() =>
  filteredLoads.value
    .filter((load) => OPEN_PIPELINE_STATUSES.includes(load.status))
    .map((load) => {
      const ageDays = getAgeDays(load);
      const createdDate = getLoadDateKey(load, 'created_at');

      return {
        id: load.id,
        age_bucket: getAgeBucket(ageDays),
        age_days: ageDays,
        created_date: createdDate,
        customer: load.customer_name || 'Unknown Customer',
        account_manager: load.account_manager_name || 'Unassigned',
        status: load.status,
        load_ref: load.load_ref_number || '—',
      };
    }),
);

const sortedAgingRows = computed(() => sortRows(agingRows.value, sortStates.aging, defaultSorts.aging));

const agingBucketRows = computed(() => {
  const buckets: Record<'0-2' | '3-7' | '8-14' | '15+', number> = {
    '0-2': 0,
    '3-7': 0,
    '8-14': 0,
    '15+': 0,
  };

  for (const row of agingRows.value) {
    const bucket = String(row.age_bucket) as '0-2' | '3-7' | '8-14' | '15+';
    buckets[bucket] += 1;
  }

  return buckets;
});

const agingBucketStatusBreakdown = computed(() => {
  const buckets: Record<'0-2' | '3-7' | '8-14' | '15+', Map<LoadStatus, number>> = {
    '0-2': new Map<LoadStatus, number>(),
    '3-7': new Map<LoadStatus, number>(),
    '8-14': new Map<LoadStatus, number>(),
    '15+': new Map<LoadStatus, number>(),
  };

  for (const row of agingRows.value) {
    const bucket = String(row.age_bucket) as '0-2' | '3-7' | '8-14' | '15+';
    const status = String(row.status) as LoadStatus;
    const bucketMap = buckets[bucket];
    bucketMap.set(status, (bucketMap.get(status) ?? 0) + 1);
  }

  return buckets;
});

const agingChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const items = Array.isArray(params) ? params : [params];
      const bucket = String(items[0]?.axisValue ?? '');
      const count = toNumber(items[0]?.value);
      const bucketMap = agingBucketStatusBreakdown.value[bucket as '0-2' | '3-7' | '8-14' | '15+'] ?? new Map<LoadStatus, number>();
      const statusLines = statusOptions
        .map((status) => ({ status, count: bucketMap.get(status) ?? 0 }))
        .filter((item) => item.count > 0)
        .map((item) => `${statusLabelWithLoads(item.status)} ${item.count}`);

      return [`${bucket} days`, `Open loads in this bucket: ${formatNumberValue(count)}`, ...statusLines].join('<br/>');
    },
  },
  grid: { top: 22, right: 20, left: 42, bottom: 30 },
  xAxis: {
    type: 'category',
    data: ['0-2', '3-7', '8-14', '15+'],
  },
  yAxis: {
    type: 'value',
    name: 'Loads',
  },
  series: [
    {
      type: 'bar',
      data: ['0-2', '3-7', '8-14', '15+'].map((bucket) => agingBucketRows.value[bucket as '0-2' | '3-7' | '8-14' | '15+']),
    },
  ],
}));

const ledgerColumns: ReportTableColumn[] = [
  { key: 'date', label: 'Date', sortable: true, format: 'date' },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'account_manager', label: 'Account Manager', sortable: true },
  { key: 'dispatcher', label: 'Dispatcher', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'rate', label: 'Rate', sortable: true, align: 'right', format: 'currency' },
  { key: 'miles', label: 'Miles', sortable: true, align: 'right', format: 'number' },
  { key: 'rpm', label: 'RPM', sortable: true, align: 'right', format: 'currency' },
  { key: 'load_ref', label: 'Ref #', sortable: true },
  { key: 'route', label: 'Route', sortable: true },
];

const ledgerRows = computed<ReportTableRow[]>(() =>
  filteredLoads.value.map((load) => ({
    id: load.id,
    date: getLoadDateKey(load, filters.value.dateDimension) || getLoadDateKey(load, 'created_at'),
    customer: load.customer_name || 'Unknown Customer',
    account_manager: load.account_manager_name || 'Unassigned',
    dispatcher: load.dispatcher_name || 'Unassigned',
    status: load.status,
    rate: toNumber(load.rate),
    miles: toNumber(load.miles),
    rpm: toNumber(load.rpm),
    load_ref: load.load_ref_number || '—',
    route: routeLabel(load),
  })),
);

const sortedLedgerRows = computed(() => sortRows(ledgerRows.value, sortStates.ledger, defaultSorts.ledger));

const visibleLedgerRows = computed(() => {
  if (ledgerLimit.value === 'all') {
    return sortedLedgerRows.value;
  }

  return sortedLedgerRows.value.slice(0, Number(ledgerLimit.value));
});
</script>
