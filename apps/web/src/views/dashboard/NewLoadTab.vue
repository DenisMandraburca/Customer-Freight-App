<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-black uppercase tracking-widest text-zinc-500">
        New Load
      </h2>
    </div>

    <NewLoadForm
      :customers="customers"
      :dispatchers="dispatchers"
      :current-user-name="currentUserName"
      :always-expanded="true"
      @load-created="emit('load-created')"
    />
  </div>
</template>

<script setup lang="ts">
import NewLoadForm from '@/components/loads/NewLoadForm.vue';
import type { CustomerRecord, UserRecord } from '@/types/models';

defineProps<{
  customers: CustomerRecord[];
  dispatchers: UserRecord[];
  currentUserName: string;
}>();

const emit = defineEmits<{
  'load-created': [];
}>();
</script>