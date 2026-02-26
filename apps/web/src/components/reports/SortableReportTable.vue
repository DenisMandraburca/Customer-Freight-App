<template>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-xs">
      <thead class="bg-zinc-100/80 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            class="px-3 py-2"
            :class="[
              column.sortable ? 'cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100' : '',
              alignClass(column.align),
            ]"
            @click="column.sortable ? emit('sort-change', column.key) : undefined"
          >
            {{ column.label }}
            <span v-if="column.sortable && activeSort?.key === column.key" class="ml-1 text-[10px]">
              {{ activeSort.direction === 'asc' ? '▲' : '▼' }}
            </span>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
        <tr v-for="(row, index) in rows" :key="String(row[rowKey] ?? index)" class="hover:bg-white/70 dark:hover:bg-zinc-800/40">
          <td v-for="column in columns" :key="`${column.key}-${index}`" class="px-3 py-2" :class="alignClass(column.align)">
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]" :column="column">
              {{ formatCell(row[column.key], column.format) }}
            </slot>
          </td>
        </tr>

        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="px-3 py-8 text-center text-xs text-zinc-600 dark:text-zinc-400">
            {{ emptyText }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { formatCurrencyValue, formatDateKey, formatNumberValue, formatPercentValue, type ReportSortState, type ReportTableColumn, type ReportTableRow } from './reportHelpers';

const props = withDefaults(
  defineProps<{
    columns: ReportTableColumn[];
    rows: ReportTableRow[];
    sort: ReportSortState | null;
    defaultSort?: ReportSortState | null;
    emptyText?: string;
    rowKey?: string;
  }>(),
  {
    defaultSort: null,
    emptyText: 'No records found.',
    rowKey: 'id',
  },
);

const emit = defineEmits<{
  'sort-change': [key: string];
}>();

const activeSort = computed(() => props.sort ?? props.defaultSort ?? null);

function alignClass(align: ReportTableColumn['align']): string {
  if (align === 'right') {
    return 'text-right';
  }

  if (align === 'center') {
    return 'text-center';
  }

  return 'text-left';
}

function formatCell(value: unknown, format: ReportTableColumn['format']): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (format === 'currency') {
    return formatCurrencyValue(Number(value));
  }

  if (format === 'percent') {
    return formatPercentValue(Number(value));
  }

  if (format === 'number') {
    return formatNumberValue(Number(value));
  }

  if (format === 'date') {
    return formatDateKey(String(value));
  }

  return String(value);
}
</script>
