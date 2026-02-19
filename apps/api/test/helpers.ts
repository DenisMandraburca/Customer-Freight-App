import type { FreightRepository, UserRecord, CustomerRecord } from '@antigravity/db';
import { closeDb, createRepository, getDb, runMigrations } from '@antigravity/db';

import supertest from 'supertest';

import type { Express } from 'express';

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
  sessionHeaderFor: (
    user: UserRecord,
    options?: { permissions?: string[]; isSuperAdmin?: boolean },
  ) => string;
  cleanup: () => Promise<void>;
}

export async function bootTestContext(): Promise<TestContext> {
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL && !process.env.SUPABASE_URL) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL/SUPABASE_URL) is required for API integration tests.');
  }

  await closeDb();
  await runMigrations();
  const repository = await createRepository();
  const db = await getDb();
  await db.query(
    `truncate table
      loads,
      greenbush_bank,
      customers,
      users
     restart identity cascade`,
  );

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
  const app = createApp(repository, {
    portalSessionMiddleware: (req, _res, next) => {
      const raw = req.header('x-test-session');
      if (raw) {
        const decoded = Buffer.from(raw, 'base64url').toString('utf8');
        req.userSession = JSON.parse(decoded) as {
          id: string;
          email: string;
          name: string | null;
          isSuperAdmin: boolean;
          permissions: string[];
        };
      }
      next();
    },
  });
  const request = supertest(app);

  const sessionHeaderFor = (
    user: UserRecord,
    options: { permissions?: string[]; isSuperAdmin?: boolean } = {},
  ): string => {
    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: options.isSuperAdmin ?? false,
      permissions: options.permissions ?? ['customer-freight:access'],
    };

    return Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  };

  const cleanup = async (): Promise<void> => {
    await closeDb();
  };

  return {
    app,
    request,
    repository,
    users: { manager, accountManager, dispatcher },
    customer,
    sessionHeaderFor,
    cleanup,
  };
}
