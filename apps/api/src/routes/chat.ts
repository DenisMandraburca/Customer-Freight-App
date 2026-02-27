import { Router } from 'express';
import { z } from 'zod';

import {
  HttpError,
  CHAT_TARGET_SCOPES,
  type ChatTargetScope,
  type FreightRepository,
  type LoadChatMessageRecord,
  type LoadChatLoadSummaryRecord,
  type LoadRecord,
} from '@antigravity/db';
import type { UserRole } from '@antigravity/shared';

import { requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const targetScopeSchema = z.enum(CHAT_TARGET_SCOPES);

const createChatMessageSchema = z.object({
  messageText: z.string().trim().min(1, 'Message text is required.'),
  targetScope: targetScopeSchema,
});

const clearOrderSchema = z.object({
  orderKey: z.string().trim().min(1),
});

const setProtectionSchema = z.object({
  protectFromPurge: z.boolean(),
});

function normalizeRole(role: UserRole): UserRole {
  return role === 'MANAGER' ? 'ADMIN' : role;
}

function isAdminLike(role: UserRole): boolean {
  return normalizeRole(role) === 'ADMIN';
}

function canAccessLoadForChat(
  user: { sub: string; role: UserRole; full_load_access: boolean },
  load: Pick<LoadRecord, 'account_manager_id' | 'assigned_dispatcher_id'>,
): boolean {
  if (isAdminLike(user.role)) {
    return true;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    return true;
  }

  if (user.role === 'DISPATCHER') {
    return load.assigned_dispatcher_id === user.sub;
  }

  return false;
}

function scopeChatLoadsByRole(
  user: { sub: string; role: UserRole; full_load_access: boolean },
  loads: LoadChatLoadSummaryRecord[],
): LoadChatLoadSummaryRecord[] {
  if (isAdminLike(user.role)) {
    return loads;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    return loads;
  }

  if (user.role === 'DISPATCHER') {
    return loads.filter((load) => load.assigned_dispatcher_id === user.sub);
  }

  return [];
}

function filterMessagesForUser(
  user: { sub: string; role: UserRole; full_load_access: boolean },
  messages: LoadChatMessageRecord[],
): LoadChatMessageRecord[] {
  if (isAdminLike(user.role)) {
    return messages;
  }

  if (user.role === 'ACCOUNT_MANAGER') {
    return messages;
  }

  if (user.role === 'DISPATCHER') {
    return messages.filter(
      (message) =>
        message.sender_user_id === user.sub ||
        message.target_user_id === user.sub ||
        message.target_scope === 'ORDER_PARTICIPANTS',
    );
  }

  return [];
}

function resolveTargetUserId(targetScope: ChatTargetScope, load: LoadRecord): string | null {
  if (targetScope === 'ORDER_PARTICIPANTS') {
    return null;
  }

  if (targetScope === 'ACCOUNT_MANAGER') {
    if (!load.account_manager_id) {
      throw new HttpError('Cannot target account manager on a load without account manager.', 400, 'VALIDATION_ERROR');
    }
    return load.account_manager_id;
  }

  if (!load.assigned_dispatcher_id) {
    throw new HttpError('Cannot target dispatcher on a load without assigned dispatcher.', 400, 'VALIDATION_ERROR');
  }

  return load.assigned_dispatcher_id;
}

function parseBooleanQuery(value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw === 'boolean') {
    return raw;
  }

  if (typeof raw === 'number') {
    return raw !== 0;
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === 'on';
  }

  return false;
}

function isChatVisibleStatus(
  status: LoadRecord['status'],
  hasMessages: boolean,
  options?: { includeDelivered?: boolean; isProtected?: boolean },
): boolean {
  if (status === 'BROKERAGE') {
    return false;
  }

  if (status === 'DELIVERED') {
    return Boolean(options?.includeDelivered || options?.isProtected);
  }

  if (status === 'AVAILABLE') {
    return hasMessages;
  }

  return true;
}

export function chatRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get(
    '/chat/loads',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      await repository.purgeExpiredLoadChatMessages();
      const includeDelivered = parseBooleanQuery(req.query.includeDelivered);
      const loads = await repository.listChatLoads();
      const messageCountByLoad = await repository.countLoadChatMessagesByLoad(loads.map((load) => load.id));
      const visibleLoads = loads.filter((load) =>
        isChatVisibleStatus(load.status, (messageCountByLoad.get(load.id) ?? 0) > 0, {
          includeDelivered,
          isProtected: load.is_protected,
        }),
      );
      const scoped = scopeChatLoadsByRole(req.user!, visibleLoads);
      const unreadByLoad = await repository.countUnreadChatMessagesByLoad(
        scoped.map((load) => load.id),
        { sub: req.user!.sub, role: req.user!.role },
      );
      const data = scoped.map((load) => ({
        ...load,
        unread_count: unreadByLoad.get(load.id) ?? 0,
      }));
      res.json({ success: true, data });
    }),
  );

  router.get(
    '/chat/loads/:id/messages',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      await repository.purgeExpiredLoadChatMessages();
      const includeDelivered = parseBooleanQuery(req.query.includeDelivered);
      const load = await repository.getLoadById(req.params.id);
      if (!load) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canAccessLoadForChat(req.user!, load)) {
        throw new HttpError('Cannot access chat for this load.', 403, 'PERMISSION_DENIED');
      }

      const messages = await repository.listLoadChatMessages(load.id);
      const isProtected = await repository.getLoadChatProtection(load.id);
      if (!isChatVisibleStatus(load.status, messages.length > 0, { includeDelivered, isProtected })) {
        throw new HttpError('Chat is unavailable for this load status.', 403, 'PERMISSION_DENIED');
      }

      const filtered = filterMessagesForUser(req.user!, messages);
      await repository.markLoadChatRead(load.id, req.user!.sub);
      res.json({ success: true, data: filtered });
    }),
  );

  router.post(
    '/chat/loads/:id/messages',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      await repository.purgeExpiredLoadChatMessages();
      const includeDelivered = parseBooleanQuery(req.query.includeDelivered);
      const payload = createChatMessageSchema.parse(req.body);
      const load = await repository.getLoadById(req.params.id);

      if (!load) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canAccessLoadForChat(req.user!, load)) {
        throw new HttpError('Cannot access chat for this load.', 403, 'PERMISSION_DENIED');
      }

      const existingMessages = await repository.listLoadChatMessages(load.id);
      const isProtected = await repository.getLoadChatProtection(load.id);
      if (!isChatVisibleStatus(load.status, existingMessages.length > 0, { includeDelivered, isProtected })) {
        throw new HttpError('Chat is unavailable for this load status.', 403, 'PERMISSION_DENIED');
      }

      const targetUserId = resolveTargetUserId(payload.targetScope, load);
      const message = await repository.createLoadChatMessage({
        loadId: load.id,
        senderUserId: req.user!.sub,
        senderName: req.user!.name,
        messageText: payload.messageText,
        messageType: 'MANUAL',
        targetScope: payload.targetScope,
        targetUserId,
      });

      res.status(201).json({ success: true, data: message });
    }),
  );

  router.patch(
    '/chat/loads/:id/protection',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER']),
    asyncHandler(async (req, res) => {
      const payload = setProtectionSchema.parse(req.body);
      const load = await repository.getLoadById(req.params.id);

      if (!load) {
        throw new HttpError('Load not found.', 404, 'NOT_FOUND');
      }

      if (!canAccessLoadForChat(req.user!, load)) {
        throw new HttpError('Cannot access chat for this load.', 403, 'PERMISSION_DENIED');
      }

      await repository.setLoadChatProtection(load.id, payload.protectFromPurge);
      res.json({
        success: true,
        data: {
          loadId: load.id,
          protectFromPurge: payload.protectFromPurge,
        },
      });
    }),
  );

  router.delete(
    '/chat/messages/:messageId',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      await repository.deleteLoadChatMessage(req.params.messageId);
      res.status(204).send();
    }),
  );

  router.post(
    '/chat/orders/clear',
    requireRoles(['ADMIN', 'MANAGER', 'ACCOUNT_MANAGER']),
    asyncHandler(async (req, res) => {
      const payload = clearOrderSchema.parse(req.body);
      const deletedCount = await repository.clearLoadChatMessagesByOrderKey(payload.orderKey);
      res.json({ success: true, data: { deletedCount } });
    }),
  );

  return router;
}
