<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">My Loads</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">Needs review: {{ reviewLoads.length }}</p>
    </header>

    <article class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Review Queue</h4>
      <div v-if="reviewLoads.length === 0" class="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        No pending approvals or submitted quotes.
      </div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="load in reviewLoads"
          :key="load.id"
          class="rounded-xl border border-zinc-300/60 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold">{{ load.load_ref_number }}</p>
              <p class="text-xs text-zinc-600 dark:text-zinc-300">
                {{ load.status }} • {{ load.pu_city }}, {{ load.pu_state }} -> {{ load.del_city }}, {{ load.del_state }}
              </p>
              <p v-if="load.requested_pickup_date" class="text-xs text-zinc-500 dark:text-zinc-400">
                Requested Pickup: {{ load.requested_pickup_date }}
              </p>
            </div>
            <div v-if="canDecide" class="flex gap-2">
              <button
                type="button"
                class="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                @click="emit('open-decision', load.id, 'accept')"
              >
                Accept
              </button>
              <button
                type="button"
                class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                @click="emit('open-decision', load.id, 'deny')"
              >
                Deny
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>

    <article class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">Active Queue</h4>
      <div v-if="activeLoads.length === 0" class="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        No active loads.
      </div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="load in activeLoads"
          :key="load.id"
          class="rounded-xl border border-zinc-300/60 bg-white/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold">{{ load.load_ref_number }}</p>
              <p class="text-xs text-zinc-600 dark:text-zinc-300">
                {{ load.status }} • {{ load.pu_city }}, {{ load.pu_state }} -> {{ load.del_city }}, {{ load.del_state }}
              </p>
            </div>
            <div v-if="canUpdateStatus" class="flex flex-wrap gap-2">
              <button
                v-if="load.status === 'COVERED'"
                type="button"
                class="brand-button rounded-lg px-3 py-1.5 text-xs font-semibold"
                @click="emit('set-status', load.id, 'LOADED')"
              >
                Mark Loaded
              </button>
              <template v-if="load.status === 'LOADED' || load.status === 'DELAYED'">
                <button
                  type="button"
                  class="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                  @click="emit('set-status', load.id, 'DELIVERED')"
                >
                  Deliver
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
                  @click="emit('set-status', load.id, 'DELAYED')"
                >
                  Delay
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                  @click="emit('set-status', load.id, 'CANCELED')"
                >
                  Cancel
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { LoadRecord, SessionUser } from '@/types/models';

const props = defineProps<{
  loads: LoadRecord[];
  user: SessionUser | null;
  canDecide: boolean;
  canUpdateStatus: boolean;
}>();

const emit = defineEmits<{
  'open-decision': [loadId: string, decision: 'accept' | 'deny'];
  'set-status': [loadId: string, status: 'LOADED' | 'DELIVERED' | 'DELAYED' | 'CANCELED'];
}>();

const scopedLoads = computed(() => {
  const user = props.user;
  if (!user) {
    return [] as LoadRecord[];
  }

  if (user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'VIEWER') {
    return props.loads;
  }

  if (user.role === 'DISPATCHER') {
    return props.loads.filter((load) => load.assigned_dispatcher_id === user.sub);
  }

  return props.loads.filter((load) => load.account_manager_id === user.sub);
});

const reviewLoads = computed(() =>
  scopedLoads.value.filter((load) => load.status === 'PENDING_APPROVAL' || load.status === 'QUOTE_SUBMITTED'),
);

const activeLoads = computed(() =>
  scopedLoads.value.filter((load) => load.status === 'COVERED' || load.status === 'LOADED' || load.status === 'DELAYED'),
);
</script>
