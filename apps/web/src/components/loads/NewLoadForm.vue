<template>
  <section class="glass-panel rounded-2xl p-4">
    <div v-if="!alwaysExpanded" class="flex items-center justify-between">
      <h3 class="text-xs font-black uppercase tracking-widest text-zinc-700">New Load</h3>
      <button
        type="button"
        class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Close Form' : '+ New Load' }}
      </button>
    </div>

    <transition
      :enter-active-class="alwaysExpanded ? '' : 'transition-all duration-200 ease-out'"
      :enter-from-class="alwaysExpanded ? '' : 'opacity-0 -translate-y-2'"
      :enter-to-class="alwaysExpanded ? '' : 'opacity-100 translate-y-0'"
      :leave-active-class="alwaysExpanded ? '' : 'transition-all duration-150 ease-in'"
      :leave-from-class="alwaysExpanded ? '' : 'opacity-100 translate-y-0'"
      :leave-to-class="alwaysExpanded ? '' : 'opacity-0 -translate-y-2'"
    >
      <form v-if="formVisible" class="mt-4 flex flex-col gap-4 lg:flex-row" @submit.prevent="submit('POST')">
        <div class="flex-1 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Customer
            <select v-model="state.customerId" required class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <option value="" disabled>Select Customer</option>
              <option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
            </select>
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Load Ref #
            <input
              v-model="state.loadRefNumber"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              @blur="checkDuplicateRef"
            />
          </label>
          <p v-if="duplicateWarning" class="text-xs text-amber-600 dark:text-amber-400">{{ duplicateWarning }}</p>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            McLeod #
            <input v-model="state.mcleodOrderId" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Notes
            <textarea v-model="state.notes" rows="3" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
        </div>

        <div class="mx-1 hidden w-px self-stretch border-l border-dashed border-zinc-300 dark:border-zinc-700 lg:block"></div>

        <div class="flex-1 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            PU Location
            <input
              v-model="state.puLocation"
              required
              placeholder="Chicago, IL"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <p v-if="errors.puLocation" class="text-xs text-rose-600 dark:text-rose-400">{{ errors.puLocation }}</p>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            PU ZIP
            <input
              v-model="state.puZip"
              maxlength="10"
              placeholder="60601"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Pickup Date
            <input v-model="state.puDate" required type="date" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <input v-model="state.puAppt" type="checkbox" />
            APPT
          </label>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <label v-if="state.puAppt" class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              PU Appt Time
              <input
                v-model="state.puApptTime"
                type="text"
                maxlength="50"
                placeholder="e.g. 08:00 or Dock 3"
                class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </transition>
        </div>

        <div class="mx-1 hidden w-px self-stretch border-l border-dashed border-zinc-300 dark:border-zinc-700 lg:block"></div>

        <div class="flex-1 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            DEL Location
            <input
              v-model="state.delLocation"
              required
              placeholder="Dallas, TX"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <p v-if="errors.delLocation" class="text-xs text-rose-600 dark:text-rose-400">{{ errors.delLocation }}</p>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            DEL ZIP
            <input
              v-model="state.delZip"
              maxlength="10"
              placeholder="75201"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Delivery Date
            <input v-model="state.delDate" required type="date" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <p v-if="errors.delDate" class="text-xs text-rose-600 dark:text-rose-400">{{ errors.delDate }}</p>
          <label class="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <input v-model="state.delAppt" type="checkbox" />
            APPT
          </label>
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <label v-if="state.delAppt" class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              DEL Appt Time
              <input
                v-model="state.delApptTime"
                type="text"
                maxlength="50"
                placeholder="e.g. 08:00 or Dock 3"
                class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </transition>
        </div>

        <div class="mx-1 hidden w-px self-stretch border-l border-dashed border-zinc-300 dark:border-zinc-700 lg:block"></div>

        <div class="flex-1 space-y-3">
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Rate ($)
            <input v-model.number="state.rate" required type="number" min="0.01" step="0.01" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Miles
            <input v-model.number="state.miles" required type="number" min="1" step="1" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <div class="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            RPM: ${{ rpmPreview }}
          </div>

          <button
            type="button"
            class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="state.showDispatcher = !state.showDispatcher"
          >
            {{ state.showDispatcher ? 'Hide Dispatcher' : 'Add Dispatcher' }}
          </button>

          <div v-if="state.showDispatcher" class="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/60">
            <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Dispatcher
              <select v-model="state.assignedDispatcherId" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                <option value="">Select Dispatcher</option>
                <option v-for="dispatcher in dispatcherOptions" :key="dispatcher.id" :value="dispatcher.id">{{ dispatcher.name }}</option>
              </select>
            </label>
            <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Driver Name
              <input v-model="state.driverName" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
            <label class="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              Truck #
              <input v-model="state.truckNumber" class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
            </label>
            <button type="button" class="text-xs font-semibold text-zinc-700 underline" @click="clearDispatcher">Clear</button>
          </div>

          <button type="submit" class="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Post Load</button>
          <button type="button" class="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700" @click="submit('BROKERAGE')">Brokerage</button>
          <p v-if="selectedDispatcherName" class="text-xs text-zinc-700 dark:text-zinc-400">
            Will be assigned to: {{ selectedDispatcherName }}
          </p>
        </div>
      </form>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { createLoadEnvelope, getLoads } from '@/api/freight';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type { CustomerRecord, UserRecord } from '@/types/models';

const props = withDefaults(
  defineProps<{
    customers: CustomerRecord[];
    dispatchers: UserRecord[];
    currentUserName: string;
    alwaysExpanded?: boolean;
  }>(),
  {
    alwaysExpanded: false,
  },
);

const emit = defineEmits<{
  'load-created': [];
}>();

const authStore = useAuthStore();
const uiStore = useUiStore();
const expanded = ref(false);
const duplicateWarning = ref('');

const errors = reactive({
  puLocation: '',
  delLocation: '',
  delDate: '',
});

const state = reactive({
  customerId: '',
  loadRefNumber: '',
  mcleodOrderId: '',
  notes: '',
  puLocation: '',
  puZip: '',
  puDate: '',
  puAppt: false,
  puApptTime: '',
  delLocation: '',
  delZip: '',
  delDate: '',
  delAppt: false,
  delApptTime: '',
  rate: 0,
  miles: 0,
  showDispatcher: false,
  assignedDispatcherId: '',
  driverName: '',
  truckNumber: '',
});

const formVisible = computed(() => props.alwaysExpanded || expanded.value);

const dispatcherOptions = computed(() => props.dispatchers.filter((user) => user.role === 'DISPATCHER'));

const rpmPreview = computed(() => {
  const rate = Number(state.rate);
  const miles = Number(state.miles);
  if (!Number.isFinite(rate) || rate <= 0) {
    return '—';
  }
  if (!Number.isFinite(miles)) {
    return '—';
  }
  if (miles === 0) {
    return '0.00';
  }
  if (miles < 0) {
    return '—';
  }
  return (rate / miles).toFixed(2);
});

const selectedDispatcherName = computed(() => {
  if (!state.assignedDispatcherId) {
    return '';
  }

  return dispatcherOptions.value.find((dispatcher) => dispatcher.id === state.assignedDispatcherId)?.name ?? '';
});

watch(
  () => state.puAppt,
  (next) => {
    if (!next) {
      state.puApptTime = '';
    }
  },
);

watch(
  () => state.delAppt,
  (next) => {
    if (!next) {
      state.delApptTime = '';
    }
  },
);

function splitLocation(value: string): { city: string; state: string } | null {
  const [cityRaw, stateRaw] = value.split(',');
  const city = cityRaw?.trim() ?? '';
  const state = stateRaw?.trim() ?? '';
  if (!city || state.length !== 2) {
    return null;
  }

  return {
    city,
    state: state.toUpperCase(),
  };
}

function validate(): boolean {
  errors.puLocation = '';
  errors.delLocation = '';
  errors.delDate = '';

  const pu = splitLocation(state.puLocation);
  if (!pu) {
    errors.puLocation = 'Pickup location must be in "City, ST" format.';
  }

  const del = splitLocation(state.delLocation);
  if (!del) {
    errors.delLocation = 'Delivery location must be in "City, ST" format.';
  }

  if (state.puDate && state.delDate && state.delDate < state.puDate) {
    errors.delDate = 'Delivery date must be on or after pickup date.';
  }

  return !errors.puLocation && !errors.delLocation && !errors.delDate;
}

async function checkDuplicateRef(): Promise<void> {
  const ref = state.loadRefNumber.trim();
  duplicateWarning.value = '';

  if (!ref) {
    return;
  }

  const rows = await getLoads({ ref });
  if (rows.length > 0) {
    duplicateWarning.value = `Ref # already used on Load ${rows[0]!.id}`;
  }
}

function clearDispatcher(): void {
  state.assignedDispatcherId = '';
  state.driverName = '';
  state.truckNumber = '';
}

function resetForm(): void {
  state.customerId = '';
  state.loadRefNumber = '';
  state.mcleodOrderId = '';
  state.notes = '';
  state.puLocation = '';
  state.puZip = '';
  state.puDate = '';
  state.puAppt = false;
  state.puApptTime = '';
  state.delLocation = '';
  state.delZip = '';
  state.delDate = '';
  state.delAppt = false;
  state.delApptTime = '';
  state.rate = 0;
  state.miles = 0;
  state.showDispatcher = false;
  clearDispatcher();
  duplicateWarning.value = '';
  errors.puLocation = '';
  errors.delLocation = '';
  errors.delDate = '';
}

async function submit(mode: 'POST' | 'BROKERAGE'): Promise<void> {
  if (!validate()) {
    uiStore.showToast('Please fix form errors before submitting.', 'error');
    return;
  }

  const pu = splitLocation(state.puLocation);
  const del = splitLocation(state.delLocation);
  if (!pu || !del) {
    uiStore.showToast('Invalid route format.', 'error');
    return;
  }

  const accountManagerId = authStore.user?.sub;
  if (!accountManagerId) {
    uiStore.showToast('Missing authenticated user context.', 'error');
    return;
  }

  const response = await createLoadEnvelope({
    customerId: state.customerId,
    accountManagerId,
    loadRefNumber: state.loadRefNumber.trim() || null,
    mcleodOrderId: state.mcleodOrderId.trim() || null,
    notes: state.notes.trim() || null,
    puCity: pu.city,
    puState: pu.state,
    puZip: state.puZip.trim() || null,
    puDate: state.puDate || null,
    puAppt: state.puAppt,
    puApptTime: state.puAppt ? state.puApptTime.trim() || null : null,
    delCity: del.city,
    delState: del.state,
    delZip: state.delZip.trim() || null,
    delDate: state.delDate || null,
    delAppt: state.delAppt,
    delApptTime: state.delAppt ? state.delApptTime.trim() || null : null,
    rate: Number(state.rate),
    miles: Number(state.miles),
    assignedDispatcherId: state.assignedDispatcherId || null,
    driverName: state.driverName || null,
    truckNumber: state.truckNumber || null,
    status: mode === 'BROKERAGE' ? 'BROKERAGE' : undefined,
  });

  if (response.warning) {
    uiStore.showToast(response.warning, 'warning');
  }

  uiStore.showToast(`Load created: ${response.data.id}`, 'success');
  resetForm();
  if (!props.alwaysExpanded) {
    expanded.value = false;
  }
  emit('load-created');
}
</script>