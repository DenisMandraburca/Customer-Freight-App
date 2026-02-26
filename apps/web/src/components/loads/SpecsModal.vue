<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">{{ title }}</h4>
          <button
            type="button"
            class="text-sm text-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <div class="mt-3">
          <textarea
            v-if="editable"
            v-model="localNotes"
            rows="8"
            class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p v-else class="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {{ notes || 'No specs available.' }}
          </p>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold dark:bg-zinc-700"
            @click="emit('close')"
          >
            Close
          </button>
          <button
            v-if="editable"
            type="button"
            class="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            :disabled="saving || localNotes === notes"
            @click="emit('save', localNotes)"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    notes: string;
    editable: boolean;
    saving?: boolean;
  }>(),
  {
    title: 'Load Specs',
    saving: false,
  },
);

const emit = defineEmits<{
  close: [];
  save: [notes: string];
}>();

const localNotes = ref(props.notes);

watch(
  () => props.notes,
  (next) => {
    localNotes.value = next;
  },
);
</script>
