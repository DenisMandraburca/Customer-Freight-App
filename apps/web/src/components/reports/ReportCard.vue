<template>
  <article class="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/35" :class="cardClass">
    <header class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200">{{ title }}</h3>
        <p v-if="subtitle" class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{{ subtitle }}</p>
      </div>

      <div class="flex items-center gap-1">
        <slot name="header-actions" />
        <button
          type="button"
          class="rounded border border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          :disabled="disableCsv"
          @click="emit('export-csv')"
        >
          CSV
        </button>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 transition-colors"
          aria-label="Open calculation details"
          @click="emit('open-info')"
        >
          <BadgeInfo class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div>
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
import { BadgeInfo } from 'lucide-vue-next';
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    cardClass?: string;
    disableCsv?: boolean;
  }>(),
  {
    subtitle: '',
    cardClass: '',
    disableCsv: false,
  },
);

const emit = defineEmits<{
  'open-info': [];
  'export-csv': [];
}>();
</script>
