<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">Available Loads</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ availableLoads.length }} open</p>
    </header>

    <div v-if="availableLoads.length === 0" class="rounded-xl border border-zinc-300/70 bg-white/80 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
      No available loads right now.
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="load in availableLoads"
        :key="load.id"
        class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60"
      >
        <p class="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
          {{ load.customer_name ?? 'Unknown Customer' }}
        </p>
        <h4 class="mt-1 text-base font-bold">
          {{ load.pu_city }}, {{ load.pu_state }} -> {{ load.del_city }}, {{ load.del_state }}
        </h4>
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Ref {{ load.load_ref_number }} • ${{ numberFormat(load.rate) }} • RPM {{ numberFormat(load.rpm) }}
        </p>
        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Quote Enabled: {{ load.customer_quote_accept ? 'Yes' : 'No' }}
        </p>

        <div class="mt-3 flex gap-2">
          <button
            v-if="canBook"
            type="button"
            class="brand-button flex-1 rounded-lg px-3 py-2 text-xs font-semibold"
            @click="emit('book', load.id)"
          >
            Book
          </button>
          <button
            v-if="canQuote && load.customer_quote_accept"
            type="button"
            class="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            @click="emit('quote', load.id)"
          >
            Quote
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { LoadRecord } from '@/types/models';

const props = defineProps<{
  loads: LoadRecord[];
  canBook: boolean;
  canQuote: boolean;
}>();

const emit = defineEmits<{
  book: [loadId: string];
  quote: [loadId: string];
}>();

const availableLoads = computed(() => props.loads.filter((load) => load.status === 'AVAILABLE'));

function numberFormat(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}
</script>
