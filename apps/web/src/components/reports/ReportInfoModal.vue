<template>
  <teleport to="body">
    <div v-if="open && info" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">{{ info.title }}</h4>
          <button
            type="button"
            class="text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            @click="emit('close')"
          >
            X
          </button>
        </div>

        <div class="mt-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
          <article class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">What this shows</h5>
            <p class="mt-2 leading-relaxed">{{ info.what }}</p>
          </article>

          <article class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">How it is calculated</h5>
            <p class="mt-2 leading-relaxed">{{ info.logic }}</p>
          </article>

          <article class="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
            <h5 class="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Filters that affect it</h5>
            <p class="mt-2 leading-relaxed">{{ info.filters }}</p>
          </article>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import type { ReportInfoDefinition } from './reportHelpers';

defineProps<{
  open: boolean;
  info: ReportInfoDefinition | null;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>
