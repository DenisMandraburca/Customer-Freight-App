<template>
  <section class="flex h-full min-h-0 flex-col gap-4">
    <header class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-black uppercase tracking-widest text-zinc-700">Load Chat</h3>
      <button
        type="button"
        class="rounded border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        @click="includeDeliveredLoads = !includeDeliveredLoads"
      >
        {{ includeDeliveredLoads ? 'Hide Chats for Delivered Loads' : 'Show Chats for Delivered Loads' }}
      </button>
    </header>

    <div class="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div class="shrink-0 border-b border-zinc-200/80 p-3 dark:border-zinc-800/80">
          <label class="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Search All
            <input
              v-model="searchAll"
              type="text"
              class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Search All"
            />
          </label>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-3">
          <div v-if="loadsQuery.isLoading.value" class="py-6 text-center text-xs text-zinc-600">Loading chats...</div>
          <div
            v-else-if="loadsQuery.isError.value"
            class="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300"
          >
            {{ (loadsQuery.error.value as Error).message }}
          </div>
          <div v-else-if="filteredLoads.length === 0" class="py-6 text-center text-xs text-zinc-600">No chat-eligible loads found.</div>

          <div v-else class="space-y-3">
            <article
              v-if="unreadLoads.length > 0"
              class="rounded-lg border border-amber-300 bg-amber-50/70 p-2 dark:border-amber-700/60 dark:bg-amber-900/15"
            >
              <button type="button" class="flex w-full items-center justify-between gap-2 text-left" @click="unreadExpanded = !unreadExpanded">
                <div class="flex items-center gap-2">
                  <p class="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Unread</p>
                  <span class="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{{ unreadLoads.length }}</span>
                </div>
                <span class="text-[10px] font-semibold text-amber-700 dark:text-amber-300">{{ unreadExpanded ? 'Collapse' : 'Expand' }}</span>
              </button>

              <div v-if="unreadExpanded" class="mt-2 space-y-1">
                <button
                  v-for="load in unreadLoads"
                  :key="`unread-${load.id}`"
                  type="button"
                  class="w-full rounded-md px-2 py-1.5 text-left text-xs transition"
                  :class="rowClass(load.id)"
                  @click="selectedLoadId = load.id"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-semibold">{{ load.load_ref_number || load.id }}</span>
                    <span class="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{{ load.unread_count }}</span>
                  </div>
                  <div class="truncate text-[10px]" :class="rowSubClass(load.id)">
                    {{ statusLabel(load.status) }} · {{ load.order_label }}
                  </div>
                </button>
              </div>
            </article>

            <article
              v-for="group in statusGroups"
              :key="group.status"
              class="rounded-lg border border-zinc-200/70 bg-white/70 p-2 dark:border-zinc-800/70 dark:bg-zinc-950/30"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 text-left"
                @click="toggleStatusGroup(group.status)"
              >
                <div class="flex items-center gap-2">
                  <p class="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                    {{ statusLabel(group.status) }}
                  </p>
                  <span class="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    {{ group.loads.length }}
                  </span>
                </div>
                <span class="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">{{ isStatusGroupExpanded(group.status) ? 'Collapse' : 'Expand' }}</span>
              </button>

              <div v-if="isStatusGroupExpanded(group.status)" class="mt-2 space-y-1">
                <button
                  v-for="load in group.loads"
                  :key="load.id"
                  type="button"
                  class="w-full rounded-md px-2 py-1.5 text-left text-xs transition"
                  :class="rowClass(load.id)"
                  @click="selectedLoadId = load.id"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-semibold">{{ load.load_ref_number || load.id }}</span>
                    <span v-if="load.unread_count > 0" class="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {{ load.unread_count }}
                    </span>
                  </div>
                  <div class="truncate text-[10px]" :class="rowSubClass(load.id)">
                    {{ load.pu_city }}, {{ load.pu_state }} → {{ load.del_city }}, {{ load.del_state }}
                  </div>
                </button>
              </div>
            </article>

            <article class="rounded-lg border border-zinc-300/80 bg-zinc-100/70 p-2 dark:border-zinc-700/70 dark:bg-zinc-900/50">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 text-left"
                @click="importantExpanded = !importantExpanded"
              >
                <div class="flex items-center gap-2">
                  <p class="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-100">Important Chats</p>
                  <span class="rounded-full bg-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{{ importantLoads.length }}</span>
                </div>
                <span class="text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">{{ importantExpanded ? 'Collapse' : 'Expand' }}</span>
              </button>

              <div v-if="importantExpanded" class="mt-2 space-y-1">
                <p v-if="importantLoads.length === 0" class="px-2 py-1 text-[11px] text-zinc-600 dark:text-zinc-300">No protected delivered chats.</p>
                <template v-else>
                  <button
                    v-for="load in importantLoads"
                    :key="`important-${load.id}`"
                    type="button"
                    class="w-full rounded-md px-2 py-1.5 text-left text-xs transition"
                    :class="rowClass(load.id)"
                    @click="selectedLoadId = load.id"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate font-semibold">{{ load.load_ref_number || load.id }}</span>
                      <span v-if="load.unread_count > 0" class="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {{ load.unread_count }}
                      </span>
                    </div>
                    <div class="truncate text-[10px]" :class="rowSubClass(load.id)">
                      {{ load.customer_name || 'Unknown customer' }} · {{ load.order_label }}
                    </div>
                  </button>
                </template>
              </div>
            </article>
          </div>
        </div>
      </aside>

      <article class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div v-if="!selectedLoad" class="flex flex-1 items-center justify-center px-4 text-xs text-zinc-600">
          Select a load thread to view chat.
        </div>

        <template v-else>
          <header class="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h4 class="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {{ selectedLoad.load_ref_number || selectedLoad.id }}
                  <span v-if="selectedLoad.mcleod_order_id" class="ml-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    / McLeod {{ selectedLoad.mcleod_order_id }}
                  </span>
                </h4>
                <p class="text-xs text-zinc-600 dark:text-zinc-300">
                  {{ selectedLoad.customer_name || 'Unknown customer' }} ·
                  {{ selectedLoad.pu_city }}, {{ selectedLoad.pu_state }} → {{ selectedLoad.del_city }}, {{ selectedLoad.del_state }}
                </p>
              </div>

              <div class="flex flex-col items-end gap-2">
                <label class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-zinc-400 text-red-700 focus:ring-red-500"
                    :checked="selectedLoad.is_protected"
                    :disabled="updatingProtection"
                    @change="onProtectionChange"
                  />
                  Protect from 30-day cleanup
                </label>
                <button
                  v-if="canModerateChat"
                  type="button"
                  class="rounded border border-red-300 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                  @click="clearOrderThread"
                >
                  Clear Order Thread
                </button>
              </div>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div v-if="messagesQuery.isLoading.value" class="py-6 text-center text-xs text-zinc-600">Loading messages...</div>
            <div
              v-else-if="messagesQuery.isError.value"
              class="rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300"
            >
              {{ (messagesQuery.error.value as Error).message }}
            </div>
            <div v-else-if="messages.length === 0" class="py-6 text-center text-xs text-zinc-600">No messages yet.</div>
            <div v-else class="space-y-2 pb-2">
              <article
                v-for="message in messages"
                :key="message.id"
                class="rounded-lg border px-3 py-2"
                :class="messageCardClass(message)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold">
                      {{ message.sender_name }}
                      <span v-if="message.message_type === 'SYSTEM'" class="ml-1 rounded bg-zinc-700 px-1 py-0.5 text-[10px] font-bold text-white">
                        System
                      </span>
                    </p>
                    <p class="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {{ formatMessageTime(message.created_at) }} · {{ targetScopeLabel(message) }}
                    </p>
                  </div>
                  <button
                    v-if="canModerateChat"
                    type="button"
                    class="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    @click="deleteMessage(message.id)"
                  >
                    Delete
                  </button>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-xs text-zinc-800 dark:text-zinc-100">{{ message.message_text }}</p>
              </article>
            </div>
          </div>

          <footer class="shrink-0 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
              <label class="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Send To
                <select
                  v-model="messageTargetScope"
                  class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option
                    v-for="option in targetScopeOptions"
                    :key="option.scope"
                    :value="option.scope"
                    :disabled="option.disabled"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Message
                <textarea
                  v-model="messageText"
                  rows="2"
                  class="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="Type your message"
                />
              </label>

              <div class="flex items-end justify-end">
                <button
                  type="button"
                  class="rounded bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="sending || !messageText.trim() || !selectedLoad"
                  @click="sendMessage"
                >
                  {{ sending ? 'Sending...' : 'Send' }}
                </button>
              </div>
            </div>
          </footer>
        </template>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import type { LoadStatus } from '@antigravity/shared';

import {
  clearLoadChatOrder,
  createLoadChatMessage,
  deleteLoadChatMessage,
  getChatLoads,
  getLoadChatMessages,
  updateLoadChatProtection,
} from '@/api/freight';
import { useUiStore } from '@/stores/ui';
import type { ChatTargetScope, LoadChatLoadSummaryRecord, LoadChatMessageRecord, SessionUser } from '@/types/models';

type StatusGroup = {
  status: LoadStatus;
  loads: LoadChatLoadSummaryRecord[];
};

const STATUS_ORDER: LoadStatus[] = [
  'PENDING_APPROVAL',
  'QUOTE_SUBMITTED',
  'COVERED',
  'LOADED',
  'DELAYED',
  'CANCELED',
  'TONU',
  'DELIVERED',
  'BROKERAGE',
  'AVAILABLE',
];

const props = defineProps<{
  currentUser: SessionUser | null;
}>();

const uiStore = useUiStore();

const selectedLoadId = ref('');
const messageTargetScope = ref<ChatTargetScope>('ORDER_PARTICIPANTS');
const messageText = ref('');
const searchAll = ref('');
const sending = ref(false);
const includeDeliveredLoads = ref(false);
const unreadExpanded = ref(false);
const importantExpanded = ref(false);
const statusGroupExpanded = ref<Record<string, boolean>>({});
const updatingProtection = ref(false);

const canModerateChat = computed(() =>
  props.currentUser?.role === 'ADMIN' ||
  props.currentUser?.role === 'MANAGER' ||
  props.currentUser?.role === 'ACCOUNT_MANAGER',
);

const loadsQuery = useQuery({
  queryKey: computed(() => ['chat-loads', includeDeliveredLoads.value]),
  queryFn: () => getChatLoads(includeDeliveredLoads.value),
  refetchInterval: 10000,
});

const loads = computed(() => loadsQuery.data.value ?? []);

const filteredLoads = computed(() => {
  const term = searchAll.value.trim().toLowerCase();
  if (!term) {
    return loads.value;
  }

  return loads.value.filter((load) => {
    const haystack = [
      load.id,
      load.load_ref_number,
      load.mcleod_order_id ?? '',
      load.order_label,
      load.customer_name ?? '',
      load.account_manager_name ?? '',
      load.dispatcher_name ?? '',
      load.driver_name ?? '',
      load.truck_number ?? '',
      load.pu_city,
      load.pu_state,
      load.del_city,
      load.del_state,
      load.status,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
});

const selectedLoad = computed(() => filteredLoads.value.find((load) => load.id === selectedLoadId.value) ?? null);

const messagesQuery = useQuery({
  queryKey: computed(() => ['chat-load-messages', selectedLoadId.value, includeDeliveredLoads.value]),
  queryFn: () => {
    if (!selectedLoadId.value) {
      return Promise.resolve([] as LoadChatMessageRecord[]);
    }
    return getLoadChatMessages(selectedLoadId.value, includeDeliveredLoads.value);
  },
  enabled: computed(() => Boolean(selectedLoadId.value)),
  refetchInterval: computed(() => (selectedLoadId.value ? 10000 : false)),
});

const messages = computed(() => messagesQuery.data.value ?? []);

const importantLoads = computed(() =>
  [...filteredLoads.value]
    .filter((load) => load.is_protected && load.status === 'DELIVERED')
    .sort((left, right) => {
      if (right.unread_count !== left.unread_count) {
        return right.unread_count - left.unread_count;
      }
      return toTime(right.created_at) - toTime(left.created_at);
    }),
);

const importantLoadIds = computed(() => new Set(importantLoads.value.map((load) => load.id)));

const unreadLoads = computed(() =>
  [...filteredLoads.value]
    .filter((load) => load.unread_count > 0 && !importantLoadIds.value.has(load.id))
    .sort((left, right) => {
      if (right.unread_count !== left.unread_count) {
        return right.unread_count - left.unread_count;
      }
      return toTime(right.created_at) - toTime(left.created_at);
    }),
);

const statusGroups = computed<StatusGroup[]>(() => {
  const unreadIds = new Set(unreadLoads.value.map((load) => load.id));
  const grouped = new Map<LoadStatus, LoadChatLoadSummaryRecord[]>();

  for (const load of filteredLoads.value) {
    if (unreadIds.has(load.id) || importantLoadIds.value.has(load.id)) {
      continue;
    }

    if (!grouped.has(load.status)) {
      grouped.set(load.status, []);
    }
    grouped.get(load.status)!.push(load);
  }

  return [...grouped.entries()]
    .sort((left, right) => {
      const leftIndex = STATUS_ORDER.indexOf(left[0]);
      const rightIndex = STATUS_ORDER.indexOf(right[0]);
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([status, groupedLoads]) => ({
      status,
      loads: [...groupedLoads].sort((left, right) => toTime(right.created_at) - toTime(left.created_at)),
    }));
});

const targetScopeOptions = computed(() => {
  const load = selectedLoad.value;
  const options: Array<{ scope: ChatTargetScope; label: string; disabled: boolean }> = [
    {
      scope: 'ORDER_PARTICIPANTS',
      label: 'All participants',
      disabled: false,
    },
    {
      scope: 'ACCOUNT_MANAGER',
      label: `Account manager${load?.account_manager_name ? ` (${load.account_manager_name})` : ''}`,
      disabled: !load?.account_manager_id,
    },
    {
      scope: 'DISPATCHER',
      label: `Dispatcher${load?.dispatcher_name ? ` (${load.dispatcher_name})` : ''}`,
      disabled: !load?.assigned_dispatcher_id,
    },
  ];

  return options;
});

watch(
  filteredLoads,
  (rows) => {
    if (!rows.length) {
      selectedLoadId.value = '';
      return;
    }

    if (!rows.some((row) => row.id === selectedLoadId.value)) {
      selectedLoadId.value = rows[0]!.id;
    }
  },
  { immediate: true },
);

watch(
  statusGroups,
  (groups) => {
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      next[group.status] = statusGroupExpanded.value[group.status] ?? false;
    }
    statusGroupExpanded.value = next;
  },
  { immediate: true },
);

watch(
  () => messagesQuery.dataUpdatedAt.value,
  () => {
    void loadsQuery.refetch();
  },
);

watch(targetScopeOptions, (options) => {
  const selected = options.find((option) => option.scope === messageTargetScope.value);
  if (!selected || selected.disabled) {
    messageTargetScope.value = options.find((option) => !option.disabled)?.scope ?? 'ORDER_PARTICIPANTS';
  }
});

async function sendMessage(): Promise<void> {
  const load = selectedLoad.value;
  const text = messageText.value.trim();

  if (!load || !text) {
    return;
  }

  sending.value = true;
  try {
    await createLoadChatMessage(
      load.id,
      {
        messageText: text,
        targetScope: messageTargetScope.value,
      },
      includeDeliveredLoads.value,
    );
    messageText.value = '';
    await Promise.all([loadsQuery.refetch(), messagesQuery.refetch()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    uiStore.showToast(message, 'error');
  } finally {
    sending.value = false;
  }
}

async function onProtectionChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const load = selectedLoad.value;

  if (!input || !load) {
    return;
  }

  updatingProtection.value = true;
  try {
    await updateLoadChatProtection(load.id, { protectFromPurge: input.checked });
    await loadsQuery.refetch();
    uiStore.showToast(input.checked ? 'Chat protection enabled' : 'Chat protection disabled', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update protection';
    uiStore.showToast(message, 'error');
  } finally {
    updatingProtection.value = false;
  }
}

async function deleteMessage(messageId: string): Promise<void> {
  if (!canModerateChat.value) {
    return;
  }

  const confirmed = window.confirm('Delete this chat message?');
  if (!confirmed) {
    return;
  }

  try {
    await deleteLoadChatMessage(messageId);
    await Promise.all([loadsQuery.refetch(), messagesQuery.refetch()]);
    uiStore.showToast('Message deleted', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    uiStore.showToast(message, 'error');
  }
}

async function clearOrderThread(): Promise<void> {
  if (!canModerateChat.value || !selectedLoad.value) {
    return;
  }

  const confirmed = window.confirm('Clear all messages for this entire order thread?');
  if (!confirmed) {
    return;
  }

  try {
    const result = await clearLoadChatOrder(selectedLoad.value.order_key);
    await Promise.all([loadsQuery.refetch(), messagesQuery.refetch()]);
    uiStore.showToast(`Removed ${result.deletedCount} messages`, 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear order thread';
    uiStore.showToast(message, 'error');
  }
}

function toggleStatusGroup(status: LoadStatus): void {
  statusGroupExpanded.value = {
    ...statusGroupExpanded.value,
    [status]: !(statusGroupExpanded.value[status] ?? false),
  };
}

function isStatusGroupExpanded(status: LoadStatus): boolean {
  return statusGroupExpanded.value[status] ?? false;
}

function toTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMessageTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function targetScopeLabel(message: LoadChatMessageRecord): string {
  if (message.target_scope === 'ORDER_PARTICIPANTS') {
    return 'All participants';
  }

  if (message.target_scope === 'ACCOUNT_MANAGER') {
    return message.target_user_name ? `Account manager: ${message.target_user_name}` : 'Account manager';
  }

  return message.target_user_name ? `Dispatcher: ${message.target_user_name}` : 'Dispatcher';
}

function statusLabel(status: LoadStatus): string {
  if (status === 'PENDING_APPROVAL') return 'Pending Approval';
  if (status === 'QUOTE_SUBMITTED') return 'Quote Submitted';
  if (status === 'COVERED') return 'Covered';
  if (status === 'LOADED') return 'Loaded';
  if (status === 'DELAYED') return 'Delayed';
  if (status === 'CANCELED') return 'Canceled';
  if (status === 'TONU') return 'TONU';
  if (status === 'DELIVERED') return 'Delivered';
  if (status === 'BROKERAGE') return 'Brokerage';
  return status;
}

function rowClass(loadId: string): string {
  return loadId === selectedLoadId.value
    ? 'bg-red-700 text-white'
    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800';
}

function rowSubClass(loadId: string): string {
  return loadId === selectedLoadId.value ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400';
}

function messageCardClass(message: LoadChatMessageRecord): string {
  const isOwn = message.sender_user_id && message.sender_user_id === props.currentUser?.sub;

  if (message.message_type === 'SYSTEM') {
    return 'border-zinc-300 bg-zinc-100/80 dark:border-zinc-700 dark:bg-zinc-800/40';
  }

  if (isOwn) {
    return 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20';
  }

  return 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40';
}
</script>
