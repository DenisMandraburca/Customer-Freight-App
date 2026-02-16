import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import type { FreightRepository, UserRecord, CustomerRecord } from '@antigravity/db';
import { closeDb, createRepository } from '@antigravity/db';

import supertest from 'supertest';

import type { Express } from 'express';

import { SESSION_COOKIE_NAME } from '../src/config.js';
import { signSession } from '../src/security.js';

export interface TestContext {
  app: Express;
  request: ReturnType<typeof supertest>;
  repository: FreightRepository;
  users: {
    manager: UserRecord;
    accountManager: UserRecord;
    dispatcher: UserRecord;
  };
  customer: CustomerRecord;
  cookieFor: (user: UserRecord) => string;
  cleanup: () => Promise<void>;
}

export async function bootTestContext(): Promise<TestContext> {
  const testDbDir = path.join(os.tmpdir(), `cfa-pglite-${randomUUID()}`);
  process.env.PGLITE_DATA_DIR = testDbDir;

  const envKeys = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_DB_URL',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_DB_HOST',
    'SUPABASE_DB_PORT',
    'SUPABASE_DB_USER',
    'SUPABASE_DB_NAME',
  ] as const;

  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<string, string | undefined>;
  for (const key of envKeys) {
    delete process.env[key];
  }

  await closeDb();
  const repository = await createRepository();

  const manager = await repository.createUser({
    email: 'manager@afctransport.com',
    name: 'Manager User',
    role: 'MANAGER',
  });

  const accountManager = await repository.createUser({
    email: 'sales@afctransport.com',
    name: 'Account Manager User',
    role: 'ACCOUNT_MANAGER',
  });

  const dispatcher = await repository.createUser({
    email: 'dispatch@afclogistics.com',
    name: 'Dispatcher User',
    role: 'DISPATCHER',
  });

  const customer = await repository.createCustomer({
    name: 'Acme Corp',
    type: 'Direct Customer',
    quoteAccept: true,
  });

  const { createApp } = await import('../src/app.js');
  const app = createApp(repository);
  const request = supertest(app);

  const cookieFor = (user: UserRecord): string => {
    const token = signSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return `${SESSION_COOKIE_NAME}=${token}`;
  };

  const cleanup = async (): Promise<void> => {
    await closeDb();
    await fs.rm(testDbDir, { recursive: true, force: true });
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousEnv[key];
      }
    }
  };

  return {
    app,
    request,
    repository,
    users: { manager, accountManager, dispatcher },
    customer,
    cookieFor,
    cleanup,
  };
}
