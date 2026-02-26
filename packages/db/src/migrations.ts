import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import SqliteDriver from 'better-sqlite3';

import type { Database } from './client.js';
import { resolveDbProvider, resolveSqliteFilePath } from './dbConfig.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(srcDir, '..');
const postgresConfigPath = 'prisma.config.ts';

let migrationsExecuted = false;

const sqliteSchemaSql = `
  PRAGMA foreign_keys = ON;

  create table if not exists users (
    id text primary key,
    email text not null unique,
    name text not null,
    role text not null default 'DISPATCHER',
    full_load_access integer not null default 0,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  );

  create table if not exists customers (
    id text primary key,
    name text not null unique,
    type text not null,
    quote_accept integer not null default 0,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  );

  create table if not exists greenbush_bank (
    id text primary key,
    legacy_id text unique,
    pickup_location text not null,
    destination text not null,
    receiving_hours text,
    price numeric not null,
    tarp text,
    remaining_count integer not null default 0,
    reserved_count integer not null default 0,
    special_notes text,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  );

  create table if not exists loads (
    id text primary key,
    legacy_id text unique,
    created_at text not null default (datetime('now')),
    status text not null default 'AVAILABLE',
    account_manager_id text,
    customer_id text,
    load_ref_number text not null,
    mcleod_order_id text,
    requested_pickup_date text,
    pu_city text not null,
    pu_state text not null,
    pu_zip text,
    pu_date text,
    pu_appt_time text,
    pu_appt integer not null default 0,
    del_city text not null,
    del_state text not null,
    del_zip text,
    del_date text,
    del_appt_time text,
    del_appt integer not null default 0,
    rate numeric not null,
    miles numeric not null,
    rpm numeric not null,
    notes text,
    equipment text,
    assigned_dispatcher_id text,
    driver_name text,
    truck_number text,
    reason_log text,
    delay_reason text,
    cancel_reason text,
    deny_quote_reason text,
    other_notes text,
    greenbush_bank_id text,
    foreign key (account_manager_id) references users(id) on update cascade on delete set null,
    foreign key (customer_id) references customers(id) on update cascade on delete set null,
    foreign key (assigned_dispatcher_id) references users(id) on update cascade on delete set null,
    foreign key (greenbush_bank_id) references greenbush_bank(id) on update cascade on delete set null
  );

  create index if not exists idx_loads_status on loads(status);
  create index if not exists idx_loads_dispatcher on loads(assigned_dispatcher_id);
  create index if not exists idx_loads_customer on loads(customer_id);
  create index if not exists idx_loads_pu_date on loads(pu_date);
  create unique index if not exists idx_loads_legacy_id_unique on loads(legacy_id);
  create unique index if not exists idx_greenbush_legacy_id_unique on greenbush_bank(legacy_id);
`;

function resolvePrismaBin(): string {
  return process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
}

async function runPrismaCommand(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvePrismaBin(), args, {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Prisma command failed with exit code ${code}.`));
    });
  });
}

function runSqliteSchemaSync(): void {
  const filePath = resolveSqliteFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const sqlite = new SqliteDriver(filePath);

  try {
    sqlite.exec(sqliteSchemaSql);
  } finally {
    sqlite.close();
  }
}

export async function runMigrations(_db?: Database): Promise<void> {
  if (migrationsExecuted || process.env.SKIP_DB_MIGRATIONS === 'true') {
    return;
  }

  const provider = resolveDbProvider();

  if (provider === 'sqlite') {
    runSqliteSchemaSync();
  } else {
    await runPrismaCommand(['migrate', 'deploy', '--config', postgresConfigPath]);
  }
  migrationsExecuted = true;
}
