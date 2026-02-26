import type { LoadStatus } from '@antigravity/shared';

import type { LoadRecord } from '@/types/models';

export type DateDimension = 'pu_date' | 'del_date' | 'created_at';
export type DateGroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type QuickRange = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';
export type ReportSortDirection = 'asc' | 'desc';

export interface ReportsGlobalFilters {
  quickRange: QuickRange;
  dateDimension: DateDimension;
  dateFrom: string;
  dateTo: string;
  dateGroupBy: DateGroupBy;
  customerTypes: string[];
  customerNames: string[];
  loadStatuses: LoadStatus[];
  accountManagerNames: string[];
  dispatcherNames: string[];
  driverNames: string[];
  truckNumbers: string[];
  search: string;
}

export interface ReportsFilterContext {
  customerTypeByName: Map<string, string>;
}

export interface ReportInfoDefinition {
  id: string;
  title: string;
  what: string;
  logic: string;
  filters: string;
}

export interface ReportTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'number' | 'currency' | 'percent' | 'date';
}

export interface ReportSortState {
  key: string;
  direction: ReportSortDirection;
}

export type ReportRowValue = string | number | boolean | null | undefined;
export type ReportTableRow = Record<string, ReportRowValue>;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const EXCEPTION_STATUSES: LoadStatus[] = ['DELAYED', 'CANCELED', 'TONU'];

export const OPEN_PIPELINE_STATUSES: LoadStatus[] = [
  'AVAILABLE',
  'PENDING_APPROVAL',
  'QUOTE_SUBMITTED',
  'COVERED',
  'LOADED',
  'DELAYED',
];

export function createDefaultReportsGlobalFilters(): ReportsGlobalFilters {
  return {
    quickRange: 'all',
    dateDimension: 'pu_date',
    dateFrom: '',
    dateTo: '',
    dateGroupBy: 'week',
    customerTypes: [],
    customerNames: [],
    loadStatuses: [],
    accountManagerNames: [],
    dispatcherNames: [],
    driverNames: [],
    truckNumbers: [],
    search: '',
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrencyValue(value: number): string {
  return `$${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentValue(value: number): string {
  return `${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatNumberValue(value: number): string {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatStatusLabel(status: LoadStatus | string): string {
  return String(status).replace(/_/g, ' ');
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateBoundaryValue(value: string, boundary: 'start' | 'end'): number | null {
  if (!value) {
    return null;
  }

  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!direct) {
    return null;
  }

  const year = Number(direct[1]);
  const month = Number(direct[2]) - 1;
  const day = Number(direct[3]);
  if (boundary === 'start') {
    return new Date(year, month, day, 0, 0, 0, 0).getTime();
  }
  return new Date(year, month, day, 23, 59, 59, 999).getTime();
}

export function extractDateKey(rawDate: string | null | undefined): string {
  if (!rawDate) {
    return '';
  }

  const direct = /^(\d{4}-\d{2}-\d{2})$/.exec(rawDate.trim());
  if (direct) {
    return direct[1];
  }

  const isoPrefix = /^(\d{4}-\d{2}-\d{2})T/.exec(rawDate.trim());
  if (isoPrefix) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatYmd(parsed);
    }

    return isoPrefix[1];
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return formatYmd(parsed);
}

export function getLoadDateKey(load: LoadRecord, dimension: DateDimension): string {
  if (dimension === 'created_at') {
    return extractDateKey(load.created_at);
  }

  if (dimension === 'del_date') {
    return extractDateKey(load.del_date);
  }

  return extractDateKey(load.pu_date);
}

export function toDateValue(dateKey: string): number | null {
  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!direct) {
    return null;
  }

  const year = Number(direct[1]);
  const month = Number(direct[2]) - 1;
  const day = Number(direct[3]);
  return new Date(year, month, day, 12, 0, 0, 0).getTime();
}

export function formatDateKey(dateKey: string): string {
  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!direct) {
    return dateKey;
  }

  return `${direct[2]}/${direct[3]}/${direct[1]}`;
}

export function formatGroupedDateKey(groupKey: string, groupBy: DateGroupBy): string {
  if (groupBy === 'day') {
    return formatDateKey(groupKey);
  }

  if (groupBy === 'week') {
    return `Wk of ${formatDateKey(groupKey)}`;
  }

  if (groupBy === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(groupKey);
    if (match) {
      return `${match[2]}/${match[1]}`;
    }
  }

  if (groupBy === 'quarter') {
    return groupKey;
  }

  return groupKey;
}

export function maxDateKey(dateKeys: string[]): string {
  let max = '';
  for (const dateKey of dateKeys) {
    if (!dateKey) {
      continue;
    }

    if (!max || dateKey > max) {
      max = dateKey;
    }
  }

  return max;
}

export function buildQuickRangeBounds(range: QuickRange, nowDate = new Date()): { from: string; to: string } {
  const now = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const to = formatYmd(now);

  if (range === 'all' || range === 'custom') {
    return { from: '', to: '' };
  }

  if (range === 'ytd') {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      from: formatYmd(start),
      to,
    };
  }

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(now.getTime() - (days - 1) * DAY_IN_MS);

  return {
    from: formatYmd(start),
    to,
  };
}

export function applyGlobalFilters(
  loads: LoadRecord[],
  filters: ReportsGlobalFilters,
  context?: ReportsFilterContext,
): LoadRecord[] {
  const term = normalizeText(filters.search);
  const fromValue = toDateBoundaryValue(filters.dateFrom, 'start');
  const toValue = toDateBoundaryValue(filters.dateTo, 'end');

  return loads.filter((load) => {
    if (filters.customerNames.length > 0 && !filters.customerNames.includes(load.customer_name ?? '')) {
      return false;
    }

    if (filters.accountManagerNames.length > 0 && !filters.accountManagerNames.includes(load.account_manager_name ?? '')) {
      return false;
    }

    if (filters.dispatcherNames.length > 0 && !filters.dispatcherNames.includes(load.dispatcher_name ?? '')) {
      return false;
    }

    if (filters.driverNames.length > 0 && !filters.driverNames.includes(load.driver_name ?? '')) {
      return false;
    }

    if (filters.truckNumbers.length > 0 && !filters.truckNumbers.includes(load.truck_number ?? '')) {
      return false;
    }

    if (filters.loadStatuses.length > 0 && !filters.loadStatuses.includes(load.status)) {
      return false;
    }

    if (filters.customerTypes.length > 0) {
      const customerType = context?.customerTypeByName.get((load.customer_name ?? '').trim().toLowerCase()) ?? 'Unknown';
      if (!filters.customerTypes.includes(customerType)) {
        return false;
      }
    }

    if (term) {
      const customerType = context?.customerTypeByName.get((load.customer_name ?? '').trim().toLowerCase()) ?? '';
      const haystack = [
        load.load_ref_number,
        load.mcleod_order_id ?? '',
        load.customer_name ?? '',
        customerType,
        load.account_manager_name ?? '',
        load.dispatcher_name ?? '',
        load.driver_name ?? '',
        load.truck_number ?? '',
        load.pu_city,
        load.pu_state,
        load.del_city,
        load.del_state,
        load.status,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(term)) {
        return false;
      }
    }

    if (fromValue !== null || toValue !== null) {
      const dateKey = getLoadDateKey(load, filters.dateDimension);
      if (!dateKey) {
        return false;
      }

      const dateValue = toDateValue(dateKey);
      if (dateValue === null) {
        return false;
      }

      if (fromValue !== null && dateValue < fromValue) {
        return false;
      }

      if (toValue !== null && dateValue > toValue) {
        return false;
      }
    }

    return true;
  });
}

function toGroupedDateKey(dateKey: string, groupBy: DateGroupBy): string {
  if (groupBy === 'day') {
    return dateKey;
  }

  if (groupBy === 'year') {
    return dateKey.slice(0, 4);
  }

  if (groupBy === 'month') {
    return dateKey.slice(0, 7);
  }

  if (groupBy === 'quarter') {
    const direct = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateKey);
    if (!direct) {
      return dateKey;
    }

    const year = direct[1];
    const month = Number(direct[2]);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  }

  const value = toDateValue(dateKey);
  if (value === null) {
    return dateKey;
  }

  const date = new Date(value);
  const day = date.getDay();
  const offset = (day + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
  return formatYmd(monday);
}

export function groupLoadsByDate(loads: LoadRecord[], dimension: DateDimension, groupBy: DateGroupBy): Map<string, LoadRecord[]> {
  const grouped = new Map<string, LoadRecord[]>();

  for (const load of loads) {
    const dateKey = getLoadDateKey(load, dimension);
    if (!dateKey) {
      continue;
    }

    const groupKey = toGroupedDateKey(dateKey, groupBy);

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(load);
  }

  return grouped;
}

export function cycleSortState(current: ReportSortState | null, key: string): ReportSortState | null {
  if (!current || current.key !== key) {
    return { key, direction: 'asc' };
  }

  if (current.direction === 'asc') {
    return { key, direction: 'desc' };
  }

  return null;
}

function toComparableDate(value: ReportRowValue): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const key = extractDateKey(value);
  if (!key) {
    return null;
  }

  return toDateValue(key);
}

function compareValues(left: ReportRowValue, right: ReportRowValue): number {
  if (typeof left === 'number' && typeof right === 'number') {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  const leftDate = toComparableDate(left);
  const rightDate = toComparableDate(right);
  if (leftDate !== null && rightDate !== null) {
    if (leftDate < rightDate) return -1;
    if (leftDate > rightDate) return 1;
    return 0;
  }

  const leftText = String(left ?? '').toLowerCase();
  const rightText = String(right ?? '').toLowerCase();
  return leftText.localeCompare(rightText, undefined, { sensitivity: 'base' });
}

export function sortRows<T extends ReportTableRow>(
  rows: T[],
  sort: ReportSortState | null,
  defaultSort: ReportSortState | null = null,
): T[] {
  const activeSort = sort ?? defaultSort;
  if (!activeSort) {
    return [...rows];
  }

  return [...rows].sort((left, right) => {
    const cmp = compareValues(left[activeSort.key], right[activeSort.key]);
    if (cmp !== 0) {
      return activeSort.direction === 'asc' ? cmp : -cmp;
    }

    const leftId = String(left.id ?? '');
    const rightId = String(right.id ?? '');
    return leftId.localeCompare(rightId, undefined, { sensitivity: 'base' });
  });
}

export function getReasonText(load: LoadRecord): string {
  return (
    load.delay_reason?.trim() ||
    load.cancel_reason?.trim() ||
    load.deny_quote_reason?.trim() ||
    load.reason_log?.trim() ||
    'No reason provided'
  );
}

export function getAgeDays(load: LoadRecord, now = new Date()): number {
  const createdKey = extractDateKey(load.created_at);
  const createdValue = toDateValue(createdKey);
  if (createdValue === null) {
    return 0;
  }

  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((nowStart - createdValue) / DAY_IN_MS);
  return Math.max(diffDays, 0);
}

export function getAgeBucket(ageDays: number): '0-2' | '3-7' | '8-14' | '15+' {
  if (ageDays <= 2) {
    return '0-2';
  }

  if (ageDays <= 7) {
    return '3-7';
  }

  if (ageDays <= 14) {
    return '8-14';
  }

  return '15+';
}
