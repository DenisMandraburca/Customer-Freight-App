<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-500">Settings</h3>
      <p class="text-xs text-zinc-500">{{ filteredUsers.length }} users</p>
    </header>

    <div class="mb-4 flex flex-col gap-4 lg:flex-row">
      <div class="w-full glass-panel rounded-xl p-4 space-y-3 lg:w-[30%]">
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-500">Search</h3>
        <input
          v-model="search"
          type="text"
          placeholder="Search by name or email..."
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          v-model="roleFilter"
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="ACCOUNT_MANAGER">ACCOUNT MANAGER</option>
          <option value="DISPATCHER">DISPATCHER</option>
          <option value="VIEWER">VIEWER</option>
          <option value="BANNED">BANNED</option>
        </select>
      </div>

      <div v-if="canManage" class="flex-1 glass-panel rounded-xl p-4">
        <h3 class="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
          {{ editingUser ? 'Edit User' : 'Add User' }}
        </h3>
        <form class="grid grid-cols-1 gap-3 sm:grid-cols-3" @submit.prevent="submitUser">
          <label class="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-2">
            Email
            <input
              v-model="form.email"
              required
              type="email"
              :readonly="Boolean(editingUser)"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
            Name
            <input
              v-model="form.name"
              required
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label class="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
            Role
            <select
              v-model="form.role"
              class="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
            </select>
          </label>
          <div class="flex items-end justify-start sm:col-span-2 sm:justify-end">
            <div class="flex gap-2">
              <button type="submit" class="rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
                {{ editingUser ? 'Save Changes' : 'Add User' }}
              </button>
              <button
                v-if="editingUser"
                type="button"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </div>
          </div>
          <label v-if="form.role === 'ACCOUNT_MANAGER'" class="flex items-center gap-2 pt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:col-span-3">
            <input v-model="form.fullLoadAccess" type="checkbox" />
            Full Load & Customer Access
          </label>
        </form>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-zinc-100/70 text-[10px] uppercase tracking-widest text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-300">
            <tr>
              <th class="px-3 py-2">Email</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Role</th>
              <th class="px-3 py-2">Full Access</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr v-for="user in filteredUsers" :key="user.id">
              <td class="px-3 py-2">{{ user.email }}</td>
              <td class="px-3 py-2 font-semibold">{{ user.name }}</td>
              <td class="px-3 py-2">
                <span v-if="isProtected(user)" class="font-semibold text-amber-700 dark:text-amber-400">Super Admin (Protected)</span>
                <span v-else>{{ user.role }}</span>
              </td>
              <td class="px-3 py-2">
                <button
                  v-if="user.role === 'ACCOUNT_MANAGER'"
                  type="button"
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="user.full_load_access ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'"
                  :disabled="!canManage || isProtected(user)"
                  @click="toggleFullAccess(user)"
                >
                  {{ user.full_load_access ? 'Full' : 'Limited' }}
                </button>
                <span v-else></span>
              </td>
              <td class="px-3 py-2 text-right">
                <div v-if="canManage" class="inline-flex gap-1">
                  <button
                    type="button"
                    class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                    :disabled="isProtected(user)"
                    @click="startEdit(user)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="user.id !== currentUserId"
                    type="button"
                    class="rounded bg-amber-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    :disabled="isProtected(user)"
                    @click="emit('ban', user.id)"
                  >
                    Ban
                  </button>
                  <button
                    v-if="user.id !== currentUserId"
                    type="button"
                    class="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    :disabled="isProtected(user)"
                    @click="emit('delete', user.id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="5" class="py-8 text-center text-xs text-zinc-400">No records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="glass-panel rounded-xl p-4 space-y-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-500">Users - Bulk Upload</h3>
        <button
          type="button"
          class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="downloadTemplate('users')"
        >
          Download CSV Template
        </button>
        <label class="block">
          <span class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Choose CSV File</span>
          <input
            :key="inputKeys.users"
            type="file"
            accept=".csv"
            class="mt-1 block w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            @change="onFileSelected('users', $event)"
          />
        </label>
        <div v-if="selectedFiles.users" class="flex gap-2">
          <button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700" @click="previewCsv('users')">Preview</button>
          <button type="button" class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200" @click="cancelFile('users')">Cancel</button>
        </div>
      </div>

      <div class="glass-panel rounded-xl p-4 space-y-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-500">Available Loads - Bulk Upload</h3>
        <button
          type="button"
          class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="downloadTemplate('loads')"
        >
          Download CSV Template
        </button>
        <label class="block">
          <span class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Choose CSV File</span>
          <input
            :key="inputKeys.loads"
            type="file"
            accept=".csv"
            class="mt-1 block w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            @change="onFileSelected('loads', $event)"
          />
        </label>
        <div v-if="selectedFiles.loads" class="flex gap-2">
          <button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700" @click="previewCsv('loads')">Preview</button>
          <button type="button" class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200" @click="cancelFile('loads')">Cancel</button>
        </div>
      </div>

      <div class="glass-panel rounded-xl p-4 space-y-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-zinc-500">Customers - Bulk Upload</h3>
        <button
          type="button"
          class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="downloadTemplate('customers')"
        >
          Download CSV Template
        </button>
        <label class="block">
          <span class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">Choose CSV File</span>
          <input
            :key="inputKeys.customers"
            type="file"
            accept=".csv"
            class="mt-1 block w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200"
            @change="onFileSelected('customers', $event)"
          />
        </label>
        <div v-if="selectedFiles.customers" class="flex gap-2">
          <button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700" @click="previewCsv('customers')">Preview</button>
          <button type="button" class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200" @click="cancelFile('customers')">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-5xl rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-bold">Preview: {{ categoryLabel(previewCategory) }} Upload ({{ previewTotalRows }} rows)</h4>
          <button type="button" class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" @click="showPreviewModal = false">X</button>
        </div>

        <div class="mt-3 max-h-[55vh] overflow-auto rounded border border-zinc-200 dark:border-zinc-800">
          <table class="min-w-full text-left text-xs">
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr v-for="(row, rowIndex) in currentPreviewRows" :key="`${previewCategory}-${rowIndex}`">
                <td v-for="(cell, cellIndex) in row" :key="`${previewCategory}-${rowIndex}-${cellIndex}`" class="px-2 py-1">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-2 text-xs text-zinc-500">Showing first 10 rows of {{ previewTotalRows }} total rows</p>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200"
            @click="showPreviewModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            @click="confirmImport(previewCategory)"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';

import { USER_ROLES } from '@antigravity/shared';

import {
  bulkImportCustomers,
  bulkImportLoads,
  bulkImportUsers,
  type BulkImportResult,
} from '@/api/freight';
import { useUiStore } from '@/stores/ui';
import type { UserRecord } from '@/types/models';

type BulkCategory = 'users' | 'loads' | 'customers';

const props = defineProps<{
  users: UserRecord[];
  canManage: boolean;
  currentUserId: string;
}>();

const emit = defineEmits<{
  create: [payload: { email: string; name: string; role: UserRecord['role']; fullLoadAccess?: boolean }];
  update: [payload: { id: string; data: { email: string; name: string; role: UserRecord['role']; fullLoadAccess?: boolean } }];
  delete: [userId: string];
  ban: [userId: string];
}>();

const roleOptions = USER_ROLES;
const search = ref('');
const roleFilter = ref('');
const editingUser = ref<UserRecord | null>(null);
const superAdminEmail = (import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();

const form = reactive({
  name: '',
  email: '',
  role: 'VIEWER' as UserRecord['role'],
  fullLoadAccess: false,
});

const queryClient = useQueryClient();
const uiStore = useUiStore();

const selectedFiles = reactive<Record<BulkCategory, File | null>>({
  users: null,
  loads: null,
  customers: null,
});

const parsedPreview = ref<Partial<Record<BulkCategory, string[][]>>>({});
const showPreviewModal = ref(false);
const previewCategory = ref<BulkCategory>('users');
const previewTotalRows = ref(0);
const inputKeys = reactive<Record<BulkCategory, number>>({
  users: 0,
  loads: 0,
  customers: 0,
});

const filteredUsers = computed(() => {
  const term = search.value.trim().toLowerCase();
  return props.users.filter((user) => {
    if (roleFilter.value && user.role !== roleFilter.value) {
      return false;
    }
    if (!term) {
      return true;
    }
    return `${user.name} ${user.email}`.toLowerCase().includes(term);
  });
});

const canSubmit = computed(() => form.name.trim().length > 0 && form.email.trim().length > 0);

const currentPreviewRows = computed(() => parsedPreview.value[previewCategory.value] ?? []);

function isProtected(user: UserRecord): boolean {
  return Boolean(superAdminEmail) && user.email.trim().toLowerCase() === superAdminEmail;
}

function toggleFullAccess(user: UserRecord): void {
  if (!props.canManage || isProtected(user) || user.role !== 'ACCOUNT_MANAGER') {
    return;
  }

  emit('update', {
    id: user.id,
    data: {
      email: user.email,
      name: user.name,
      role: user.role,
      fullLoadAccess: !user.full_load_access,
    },
  });
}

function submitUser(): void {
  if (!canSubmit.value) {
    return;
  }

  const payload = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    fullLoadAccess: form.role === 'ACCOUNT_MANAGER' ? form.fullLoadAccess : undefined,
  };

  if (editingUser.value) {
    emit('update', { id: editingUser.value.id, data: payload });
  } else {
    emit('create', payload);
  }

  cancelEdit();
}

function startEdit(user: UserRecord): void {
  if (isProtected(user)) {
    return;
  }

  editingUser.value = user;
  form.name = user.name;
  form.email = user.email;
  form.role = user.role;
  form.fullLoadAccess = user.full_load_access;
}

function cancelEdit(): void {
  editingUser.value = null;
  form.name = '';
  form.email = '';
  form.role = 'VIEWER';
  form.fullLoadAccess = false;
}

function downloadTemplate(category: BulkCategory): void {
  const headers: Record<BulkCategory, string[]> = {
    users: ['Email', 'Name', 'Role', 'Full_Load_Access'],
    loads: [
      'Customer',
      'Load_Ref_Number',
      'McLeod_ID',
      'PU_City',
      'PU_State',
      'PU_ZIP',
      'PU_Date',
      'PU_APPT',
      'PU_APPT_Time',
      'DEL_City',
      'DEL_State',
      'DEL_ZIP',
      'DEL_Date',
      'DEL_APPT',
      'DEL_APPT_Time',
      'Rate',
      'Miles',
      'Notes',
    ],
    customers: ['Name', 'Type', 'Quote_Accept'],
  };

  const content = `${headers[category].join(',')}\n`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${category}-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function onFileSelected(category: BulkCategory, event: Event): void {
  const target = event.target as HTMLInputElement;
  selectedFiles[category] = target.files?.[0] ?? null;
}

async function previewCsv(category: BulkCategory): Promise<void> {
  const file = selectedFiles[category];
  if (!file) {
    return;
  }

  const raw = await file.text();
  const rows = parseCsv(raw);
  parsedPreview.value[category] = rows.slice(0, 10);
  previewCategory.value = category;
  previewTotalRows.value = rows.length;
  showPreviewModal.value = true;
}

function cancelFile(category: BulkCategory): void {
  selectedFiles[category] = null;
  inputKeys[category] += 1;
}

async function confirmImport(category: BulkCategory): Promise<void> {
  const file = selectedFiles[category];
  if (!file) {
    return;
  }

  try {
    const rows = parseCsv(await file.text());
    const objectRows = toObjectRows(rows);

    let result: BulkImportResult;
    if (category === 'users') {
      result = await bulkImportUsers(objectRows);
    } else if (category === 'loads') {
      result = await bulkImportLoads(objectRows);
    } else {
      result = await bulkImportCustomers(objectRows);
    }

    await queryClient.invalidateQueries({ queryKey: ['initial-data'] });

    if (result.failedCount === 0) {
      uiStore.showToast(`Imported ${result.importedCount}/${result.totalRows} ${category}`, 'success');
      cancelFile(category);
    } else {
      uiStore.showToast(
        `Partial import: ${result.importedCount} imported, ${result.failedCount} failed`,
        'warning',
      );
    }

    showPreviewModal.value = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    uiStore.showToast(message, 'error');
  }
}

function parseCsv(raw: string): string[][] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(',').map((value) => value.trim()));
}

function toObjectRows(rows: string[][]): Array<Record<string, string>> {
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0] ?? [];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? '';
    });
    return record;
  });
}

function categoryLabel(category: BulkCategory): string {
  if (category === 'users') return 'Users';
  if (category === 'loads') return 'Available Loads';
  return 'Customers';
}
</script>

