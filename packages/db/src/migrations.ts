import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import SqliteDriver, { type Database as SqliteDatabaseDriver } from 'better-sqlite3';

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
    default_flat_pay numeric,
    exclude_from_payroll integer not null default 0,
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

  create table if not exists load_chat_messages (
    id text primary key,
    load_id text not null,
    sender_user_id text,
    sender_name text not null,
    message_text text not null,
    message_type text not null,
    target_scope text not null,
    target_user_id text,
    system_event text,
    created_at text not null default (datetime('now')),
    foreign key (load_id) references loads(id) on update cascade on delete cascade,
    foreign key (sender_user_id) references users(id) on update cascade on delete set null,
    foreign key (target_user_id) references users(id) on update cascade on delete set null
  );

  create table if not exists load_chat_settings (
    load_id text primary key,
    protect_from_purge integer not null default 0,
    foreign key (load_id) references loads(id) on update cascade on delete cascade
  );

  create table if not exists load_chat_retention (
    load_id text primary key,
    purge_after text not null,
    foreign key (load_id) references loads(id) on update cascade on delete cascade
  );

  create table if not exists load_chat_reads (
    user_id text not null,
    load_id text not null,
    last_read_at text not null default (datetime('now')),
    primary key (user_id, load_id),
    foreign key (user_id) references users(id) on update cascade on delete cascade,
    foreign key (load_id) references loads(id) on update cascade on delete cascade
  );

  create table if not exists settlement_tier_configs (
    id text primary key,
    version integer not null unique,
    is_active integer not null default 0,
    broker_load_pay numeric not null default 5.00,
    tier1_max_load integer not null,
    tier1_rate numeric not null,
    tier2_max_load integer not null,
    tier2_rate numeric not null,
    tier3_rate numeric not null,
    created_by_user_id text,
    created_at text not null default (datetime('now')),
    foreign key (created_by_user_id) references users(id) on update cascade on delete set null
  );

  create table if not exists settlement_direct_customer_exceptions (
    id text primary key,
    customer_id text not null unique,
    created_by_user_id text,
    created_at text not null default (datetime('now')),
    foreign key (customer_id) references customers(id) on update cascade on delete cascade,
    foreign key (created_by_user_id) references users(id) on update cascade on delete set null
  );

  create table if not exists settlements (
    id text primary key,
    user_id text not null,
    month integer not null,
    year integer not null,
    calculation_method text not null,
    status text not null default 'ACTIVE',
    overridden_at text,
    overridden_by_user_id text,
    superseded_by_settlement_id text,
    default_flat_pay numeric not null,
    broker_load_count integer not null default 0,
    direct_exception_load_count integer not null default 0,
    direct_standard_load_count integer not null default 0,
    tier_applied integer not null,
    tier_rate numeric not null,
    total_load_compensation numeric not null,
    total_settlement_amount numeric not null,
    excluded_loads_json text not null default '[]',
    cross_month_loads_json text not null default '[]',
    generated_by_user_id text not null,
    tier_version integer not null,
    created_at text not null default (datetime('now')),
    foreign key (user_id) references users(id) on update cascade on delete cascade,
    foreign key (overridden_by_user_id) references users(id) on update cascade on delete set null,
    foreign key (superseded_by_settlement_id) references settlements(id) on update cascade on delete set null,
    foreign key (generated_by_user_id) references users(id) on update cascade on delete restrict
  );

  create table if not exists settlement_load_entries (
    id text primary key,
    settlement_id text not null,
    user_id text not null,
    load_id text,
    entry_type text not null,
    compensation_amount numeric not null,
    customer_type_snapshot text,
    status_snapshot text,
    revenue_snapshot numeric not null,
    pu_date_snapshot text,
    del_date_snapshot text,
    load_ref_number_snapshot text,
    mcleod_order_id_snapshot text,
    customer_name_snapshot text,
    previous_settlement_id text,
    previous_settlement_month integer,
    previous_settlement_year integer,
    created_at text not null default (datetime('now')),
    foreign key (settlement_id) references settlements(id) on update cascade on delete cascade,
    foreign key (user_id) references users(id) on update cascade on delete cascade,
    foreign key (load_id) references loads(id) on update cascade on delete set null,
    foreign key (previous_settlement_id) references settlements(id) on update cascade on delete set null
  );

  create index if not exists idx_loads_status on loads(status);
  create index if not exists idx_loads_dispatcher on loads(assigned_dispatcher_id);
  create index if not exists idx_loads_customer on loads(customer_id);
  create index if not exists idx_loads_pu_date on loads(pu_date);
  create index if not exists idx_load_chat_messages_load_created_at on load_chat_messages(load_id, created_at);
  create index if not exists idx_load_chat_messages_target_user on load_chat_messages(target_user_id);
  create index if not exists idx_load_chat_retention_purge_after on load_chat_retention(purge_after);
  create index if not exists idx_load_chat_reads_load_user on load_chat_reads(load_id, user_id);
  create index if not exists idx_settlement_tier_configs_is_active on settlement_tier_configs(is_active);
  create index if not exists idx_settlements_user_month_year on settlements(user_id, year, month);
  create index if not exists idx_settlement_load_entries_settlement_id on settlement_load_entries(settlement_id);
  create index if not exists idx_settlement_load_entries_load_id on settlement_load_entries(load_id);
  create index if not exists idx_settlement_load_entries_user_id on settlement_load_entries(user_id);
  create unique index if not exists idx_loads_legacy_id_unique on loads(legacy_id);
  create unique index if not exists idx_greenbush_legacy_id_unique on greenbush_bank(legacy_id);
  create unique index if not exists idx_settlements_active_unique on settlements(user_id, month, year, calculation_method) where status = 'ACTIVE';
`;

function hasSqliteColumn(sqlite: SqliteDatabaseDriver, table: string, column: string): boolean {
  const columns = sqlite.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((item) => item.name === column);
}

function ensureSqliteColumn(sqlite: SqliteDatabaseDriver, table: string, column: string, definition: string): void {
  if (hasSqliteColumn(sqlite, table, column)) {
    return;
  }

  sqlite.exec(`alter table ${table} add column ${column} ${definition}`);
}

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
    ensureSqliteColumn(sqlite, 'users', 'default_flat_pay', 'numeric');
    ensureSqliteColumn(sqlite, 'users', 'exclude_from_payroll', 'integer not null default 0');
    ensureSqliteColumn(sqlite, 'settlement_tier_configs', 'broker_load_pay', 'numeric not null default 5.00');
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
