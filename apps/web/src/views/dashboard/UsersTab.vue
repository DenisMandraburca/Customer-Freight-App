<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-lg font-bold">Users</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ users.length }} users</p>
    </header>

    <div class="overflow-x-auto rounded-2xl border border-zinc-300/70 bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/60">
      <table class="min-w-full text-sm">
        <thead class="bg-zinc-200/70 text-xs uppercase tracking-wide text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
          <tr>
            <th class="px-3 py-3 text-left">Name</th>
            <th class="px-3 py-3 text-left">Email</th>
            <th class="px-3 py-3 text-left">Role</th>
            <th class="px-3 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-t border-zinc-200/70 dark:border-zinc-800">
            <td class="px-3 py-2 font-semibold">{{ user.name }}</td>
            <td class="px-3 py-2">{{ user.email }}</td>
            <td class="px-3 py-2">{{ user.role }}</td>
            <td class="px-3 py-2">
              <div v-if="canManage" class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  @click="startEdit(user)"
                >
                  Edit
                </button>
                <button
                  v-if="user.role !== 'BANNED' && user.id !== currentUserId"
                  type="button"
                  class="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white"
                  @click="emit('ban', user.id)"
                >
                  Ban
                </button>
                <button
                  v-if="user.id !== currentUserId"
                  type="button"
                  class="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                  @click="emit('delete', user.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="4" class="px-3 py-6 text-center text-sm text-zinc-600 dark:text-zinc-300">No users loaded.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <article
      v-if="canManage"
      class="rounded-2xl border border-zinc-300/70 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
    >
      <h4 class="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
        {{ editingId ? 'Edit User' : 'Create User' }}
      </h4>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
          Name
          <input
            v-model="form.name"
            class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          />
        </label>
        <label class="text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300 md:col-span-2">
          Email
          <input
            v-model="form.email"
            type="email"
            class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
          />
        </label>
      </div>
      <label class="mt-3 block text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-300">
        Role
        <select
          v-model="form.role"
          class="mt-1 w-full rounded-lg border border-zinc-300/70 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
        </select>
      </label>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="brand-button rounded-lg px-3 py-2 text-xs font-semibold"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ editingId ? 'Update User' : 'Create User' }}
        </button>
        <button
          v-if="editingId"
          type="button"
          class="rounded-lg bg-zinc-200 px-3 py-2 text-xs font-semibold dark:bg-zinc-700"
          @click="resetForm"
        >
          Cancel
        </button>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import { USER_ROLES } from '@antigravity/shared';

import type { UserRecord } from '@/types/models';

const props = defineProps<{
  users: UserRecord[];
  canManage: boolean;
  currentUserId: string;
}>();

const emit = defineEmits<{
  create: [payload: { email: string; name: string; role: UserRecord['role'] }];
  update: [payload: { id: string; data: { email: string; name: string; role: UserRecord['role'] } }];
  delete: [userId: string];
  ban: [userId: string];
}>();

const roleOptions = USER_ROLES;
const editingId = ref('');

const form = reactive({
  name: '',
  email: '',
  role: 'VIEWER' as UserRecord['role'],
});

const canSubmit = computed(() => form.name.trim().length > 0 && form.email.trim().length > 0);

function submit(): void {
  if (!canSubmit.value) {
    return;
  }

  const payload = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
  };

  if (editingId.value) {
    emit('update', { id: editingId.value, data: payload });
  } else {
    emit('create', payload);
  }

  resetForm();
}

function startEdit(user: UserRecord): void {
  editingId.value = user.id;
  form.name = user.name;
  form.email = user.email;
  form.role = user.role;
}

function resetForm(): void {
  editingId.value = '';
  form.name = '';
  form.email = '';
  form.role = 'VIEWER';
}
</script>
