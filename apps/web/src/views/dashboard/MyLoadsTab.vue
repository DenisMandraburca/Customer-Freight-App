<template>
  <section class="space-y-6">
    <header class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">My Loads</h3>
      <p class="text-xs text-zinc-700">Pending: {{ reviewLoads.length + greenbushRequests.length }}</p>
    </header>

    <article class="space-y-3">
      <h4 class="text-xs font-black uppercase tracking-widest text-zinc-600">Pending / Quotes</h4>
      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th class="px-3 py-2">Ref#</th>
                <th class="px-3 py-2">Customer</th>
                <th class="px-3 py-2">Route</th>
                <th class="px-3 py-2">Dispatcher</th>
                <th class="px-3 py-2">Driver/Truck</th>
                <th class="px-3 py-2">PU Date</th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="load in reviewLoads" :key="load.id">
                <td class="px-3 py-2 font-semibold">{{ load.load_ref_number || '—' }}</td>
                <td class="px-3 py-2">{{ load.customer_name || '—' }}</td>
                <td class="px-3 py-2">{{ load.pu_city }}, {{ load.pu_state }} → {{ load.del_city }}, {{ load.del_state }}</td>
                <td class="px-3 py-2">{{ load.dispatcher_name || '—' }}</td>
                <td class="px-3 py-2">{{ load.driver_name || '—' }} / {{ load.truck_number || '—' }}</td>
                <td class="px-3 py-2">{{ formatDateDisplay(load.pu_date) || '—' }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="rounded-full px-3 py-1 text-xs font-bold text-white"
                    :class="reviewButtonClass(load.status, canDecide)"
                    :disabled="!canDecide"
                    @click="openReview(load)"
                  >
                    {{ load.status === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Quote Submitted' }}
                  </button>
                </td>
              </tr>
              <tr v-if="reviewLoads.length === 0">
                <td colspan="7" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>

    <article class="space-y-3">
      <h4 class="text-xs font-black uppercase tracking-widest text-zinc-600">Greenbush Requests</h4>
      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th class="px-3 py-2">Route</th>
                <th class="px-3 py-2">Requested Pickup Date</th>
                <th class="px-3 py-2">Dispatcher</th>
                <th class="px-3 py-2">Truck</th>
                <th class="px-3 py-2">Driver</th>
                <th class="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="row in greenbushRequests" :key="row.id">
                <td class="px-3 py-2">{{ row.pu_city }}, {{ row.pu_state }} → {{ row.del_city }}, {{ row.del_state }}</td>
                <td class="px-3 py-2">{{ formatDateDisplay(row.requested_pickup_date) || '—' }}</td>
                <td class="px-3 py-2">{{ row.dispatcher_name || '—' }}</td>
                <td class="px-3 py-2">{{ row.truck_number || '—' }}</td>
                <td class="px-3 py-2">{{ row.driver_name || '—' }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    :disabled="!canDecide"
                    @click="openReview(row)"
                  >
                    Review
                  </button>
                </td>
              </tr>
              <tr v-if="greenbushRequests.length === 0">
                <td colspan="6" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>

    <article class="space-y-3">
      <h4 class="text-xs font-black uppercase tracking-widest text-zinc-600">Active Loads</h4>
      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
              <tr>
                <th class="px-3 py-2">Specs</th>
                <th class="px-3 py-2">Ref#</th>
                <th class="px-3 py-2">A.M.</th>
                <th class="px-3 py-2">Route</th>
                <th class="px-3 py-2">Dates</th>
                <th class="px-3 py-2">Driver/Truck</th>
                <th class="px-3 py-2">Dispatcher</th>
                <th class="px-3 py-2">Status</th>
                <th class="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="row in activeLoads" :key="row.id">
                <td class="px-3 py-2">
                  <button
                    v-if="hasEditableSpecs(row)"
                    type="button"
                    class="rounded px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:ring-blue-700 dark:hover:bg-blue-950/30"
                    @click="openSpecs(row)"
                  >
                    Specs
                  </button>
                  <span v-else class="text-zinc-300 dark:text-zinc-700">—</span>
                </td>
                <td class="px-3 py-2">
                  <div class="font-semibold">{{ row.load_ref_number || '—' }}</div>
                  <div v-if="row.mcleod_order_id" class="text-[10px] text-zinc-600">McLeod: {{ row.mcleod_order_id }}</div>
                </td>
                <td class="px-3 py-2">{{ row.account_manager_name || '—' }}</td>
                <td class="px-3 py-2">{{ row.pu_city }}, {{ row.pu_state }} → {{ row.del_city }}, {{ row.del_state }}</td>
                <td class="px-3 py-2">
                  <div>{{ formatDateDisplay(row.pu_date) || '—' }} - {{ formatDateDisplay(row.del_date) || '—' }}</div>
                  <div v-if="apptDisplay(row.pu_appt, row.pu_appt_time).show" :class="apptDisplay(row.pu_appt, row.pu_appt_time).className">
                    PU: {{ apptDisplay(row.pu_appt, row.pu_appt_time).text }}
                  </div>
                  <div v-if="apptDisplay(row.del_appt, row.del_appt_time).show" :class="apptDisplay(row.del_appt, row.del_appt_time).className">
                    DEL: {{ apptDisplay(row.del_appt, row.del_appt_time).text }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <div>{{ row.driver_name || '—' }}</div>
                  <div v-if="row.truck_number" class="text-[10px] text-zinc-600">Truck#: {{ row.truck_number }}</div>
                </td>
                <td class="px-3 py-2">{{ row.dispatcher_name || '—' }}</td>
                <td class="px-3 py-2">
                  <span :class="statusBadge(row.status)">{{ row.status }}</span>
                </td>
                <td class="px-3 py-2">
                  <select
                    v-model="selectedActions[row.id]"
                    class="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    @change="handleStatusAction(row, selectedActions[row.id] || '')"
                  >
                    <option value="" disabled>Select Action</option>
                    <option value="LOADED">Mark Loaded</option>
                    <option value="DELIVERED">Mark Delivered</option>
                    <option value="DELAYED">Report Delay</option>
                    <option value="CANCELED">Cancel</option>
                    <option value="TONU">TONU</option>
                  </select>
                </td>
              </tr>
              <tr v-if="activeLoads.length === 0">
                <td colspan="9" class="py-8 text-center text-xs text-zinc-600">No records found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>

    <teleport to="body">
      <SpecsModal
        v-if="selectedLoadId"
        :notes="selectedSpecs"
        :editable="canEditSpecs"
        title="Load Specs"
        @close="closeSpecs"
        @save="saveSpecs"
      />

      <div v-if="showReviewModal && reviewLoad" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold">
              Review Load {{ reviewLoad.load_ref_number || '—' }}
              <span class="font-semibold text-zinc-600 dark:text-zinc-300">
                from {{ reviewLoad.dispatcher_name || reviewLoad.account_manager_name || 'Unknown user' }}
              </span>
            </h4>
            <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeReview">X</button>
          </div>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Requested Pickup Date
              <input
                v-model="reviewState.requestedPickupDate"
                type="date"
                disabled
                class="mt-1 w-full cursor-not-allowed rounded border border-zinc-300 bg-zinc-100 px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              />
            </label>
            <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              New Delivery Date
              <input
                v-model="reviewState.newDeliveryDate"
                type="date"
                class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Load Ref #
              <input
                v-model="reviewState.loadRefNumber"
                type="text"
                class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              McLeod #
              <input
                v-model="reviewState.mcleodOrderId"
                type="text"
                class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label class="sm:col-span-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Deny Reason
              <textarea
                v-model="reviewState.denyReason"
                rows="3"
                class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                placeholder="Required when denying"
              />
            </label>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeReview">Cancel</button>
            <button type="button" class="rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800" @click="submitReview('deny')">Deny</button>
            <button type="button" class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800" @click="submitReview('accept')">Accept</button>
          </div>
        </div>
      </div>

      <div v-if="showReasonModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold">{{ reasonAction }} Reason</h4>
            <button type="button" class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100" @click="closeReasonModal">X</button>
          </div>

          <label class="mt-3 block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Reason
            <textarea
              v-model="reasonText"
              rows="4"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="Enter reason"
            />
          </label>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button" class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700" @click="closeReasonModal">Cancel</button>
            <button type="button" class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800" @click="confirmReason">Confirm</button>
          </div>
        </div>
      </div>
    </teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import type { LoadStatus } from '@antigravity/shared';

import SpecsModal from '@/components/loads/SpecsModal.vue';
import { useUiStore } from '@/stores/ui';
import type { LoadRecord, SessionUser } from '@/types/models';
import { formatDateDisplay } from '@/utils/dateFormat';

type StatusAction = 'LOADED' | 'DELIVERED' | 'DELAYED' | 'CANCELED' | 'TONU';
type ReviewDecision = 'accept' | 'deny';

const props = defineProps<{
  loads: LoadRecord[];
  user: SessionUser | null;
  canDecide: boolean;
  canUpdateStatus: boolean;
}>();

const emit = defineEmits<{
  'decide-load': [payload: {
    loadId: string;
    decision: ReviewDecision;
    requestedPickupDate?: string;
    newDeliveryDate?: string;
    loadRefNumber?: string;
    mcleodOrderId?: string;
    denyReason?: string;
  }];
  'set-status': [payload: { loadId: string; status: StatusAction; reason?: string }];
  'save-specs': [payload: { loadId: string; notes: string }];
}>();

const uiStore = useUiStore();

const selectedLoadId = ref('');
const selectedSpecs = ref('');

const showReviewModal = ref(false);
const reviewLoad = ref<LoadRecord | null>(null);
const reviewState = reactive({
  requestedPickupDate: '',
  newDeliveryDate: '',
  loadRefNumber: '',
  mcleodOrderId: '',
  denyReason: '',
});

const showReasonModal = ref(false);
const reasonLoadId = ref('');
const reasonAction = ref<StatusAction | ''>('');
const reasonText = ref('');

const selectedActions = reactive<Record<string, StatusAction | ''>>({});

const scopedLoads = computed(() => {
  const user = props.user;
  if (!user) {
    return [] as LoadRecord[];
  }

  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return props.loads;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    return props.loads;
  }

  if (user.role === 'DISPATCHER') {
    return props.loads.filter((load) => load.assigned_dispatcher_id === user.sub);
  }

  return [];
});

const reviewLoads = computed(() =>
  scopedLoads.value.filter(
    (load) =>
      (load.status === 'PENDING_APPROVAL' || load.status === 'QUOTE_SUBMITTED') &&
      load.customer_name !== 'Greenbush',
  ),
);

const greenbushRequests = computed(() =>
  scopedLoads.value.filter((load) => load.status === 'QUOTE_SUBMITTED' && load.customer_name === 'Greenbush'),
);

const activeLoads = computed(() =>
  scopedLoads.value.filter((load) => ['COVERED', 'LOADED', 'DELAYED'].includes(load.status)),
);

const canEditSpecs = computed(() =>
  props.user?.role === 'ADMIN' || props.user?.role === 'MANAGER' || props.user?.role === 'ACCOUNT_MANAGER',
);

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const direct = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }

  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})T/.exec(trimmed);
  if (isoPrefix) {
    return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
  }

  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (mmddyyyy) {
    return `${mmddyyyy[3]}-${mmddyyyy[1]!.padStart(2, '0')}-${mmddyyyy[2]!.padStart(2, '0')}`;
  }

  return '';
}

function reviewButtonClass(status: LoadStatus, enabled: boolean): string {
  if (!enabled) {
    return 'cursor-not-allowed bg-zinc-400';
  }
  if (status === 'PENDING_APPROVAL') {
    return 'cursor-pointer bg-amber-500 hover:bg-amber-600';
  }
  return 'cursor-pointer bg-blue-500 hover:bg-blue-600';
}

function hasEditableSpecs(load: LoadRecord): boolean {
  return Boolean(load.notes?.trim());
}

function openSpecs(load: LoadRecord): void {
  selectedLoadId.value = load.id;
  selectedSpecs.value = load.notes?.trim() ?? '';
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

function openReview(load: LoadRecord): void {
  if (!props.canDecide) {
    return;
  }

  reviewLoad.value = load;
  reviewState.requestedPickupDate = toDateInputValue(load.requested_pickup_date ?? load.pu_date ?? '');
  reviewState.newDeliveryDate = toDateInputValue(load.del_date);
  reviewState.loadRefNumber = load.load_ref_number ?? '';
  reviewState.mcleodOrderId = load.mcleod_order_id ?? '';
  reviewState.denyReason = '';
  showReviewModal.value = true;
}

function closeReview(): void {
  showReviewModal.value = false;
  reviewLoad.value = null;
  reviewState.requestedPickupDate = '';
  reviewState.newDeliveryDate = '';
  reviewState.loadRefNumber = '';
  reviewState.mcleodOrderId = '';
  reviewState.denyReason = '';
}

function submitReview(decision: ReviewDecision): void {
  if (!reviewLoad.value) {
    return;
  }

  if (decision === 'accept' && reviewLoad.value.status === 'QUOTE_SUBMITTED' && !reviewState.newDeliveryDate.trim()) {
    uiStore.showToast('Delivery date is required for quote acceptance.', 'error');
    return;
  }

  if (decision === 'deny' && !reviewState.denyReason.trim()) {
    uiStore.showToast('Deny reason is required.', 'error');
    return;
  }

  emit('decide-load', {
    loadId: reviewLoad.value.id,
    decision,
    requestedPickupDate: reviewState.requestedPickupDate.trim() || undefined,
    newDeliveryDate: reviewState.newDeliveryDate.trim() || undefined,
    loadRefNumber: reviewState.loadRefNumber.trim() || undefined,
    mcleodOrderId: reviewState.mcleodOrderId.trim() || undefined,
    denyReason: decision === 'deny' ? reviewState.denyReason.trim() : undefined,
  });

  closeReview();
}

function handleStatusAction(load: LoadRecord, action: string): void {
  if (!props.canUpdateStatus || !action) {
    return;
  }

  const next = action as StatusAction;
  selectedActions[load.id] = '';

  if (next === 'DELAYED' || next === 'CANCELED' || next === 'TONU') {
    reasonLoadId.value = load.id;
    reasonAction.value = next;
    reasonText.value = '';
    showReasonModal.value = true;
    return;
  }

  emit('set-status', {
    loadId: load.id,
    status: next,
  });
}

function closeReasonModal(): void {
  showReasonModal.value = false;
  reasonLoadId.value = '';
  reasonAction.value = '';
  reasonText.value = '';
}

function confirmReason(): void {
  if (!reasonLoadId.value || !reasonAction.value) {
    return;
  }

  if (!reasonText.value.trim()) {
    uiStore.showToast('Reason is required.', 'error');
    return;
  }

  emit('set-status', {
    loadId: reasonLoadId.value,
    status: reasonAction.value,
    reason: reasonText.value.trim(),
  });

  closeReasonModal();
}

function apptDisplay(flag: boolean, time: string | null): { show: boolean; text: string; className: string } {
  if (!flag) {
    return { show: false, text: '', className: '' };
  }

  if (!time || !time.trim() || time === 'Please, Set the APPT') {
    return {
      show: true,
      text: 'APPT Needed',
      className: 'mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400',
    };
  }

  return {
    show: true,
    text: time,
    className: 'mt-1 rounded bg-green-100 px-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
}

function statusBadge(status: LoadStatus): string {
  if (status === 'COVERED') {
    return 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
  if (status === 'LOADED') {
    return 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
  if (status === 'DELAYED') {
    return 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  return 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
}
</script>
