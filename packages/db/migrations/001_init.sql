create table if not exists schema_migrations (
  filename text primary key,
  executed_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('MANAGER', 'ACCOUNT_MANAGER', 'DISPATCHER', 'BANNED');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'load_status') then
    create type load_status as enum ('AVAILABLE', 'PENDING', 'COVERED', 'LOADED', 'DELIVERED', 'BROKERAGE', 'CANCELED', 'TONU');
  end if;
end $$;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  role user_role not null default 'DISPATCHER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email ~* '^[^@]+@[^@]+$')
);

create table if not exists customers (
  id uuid primary key,
  name text not null unique,
  type text not null check (type in ('Direct Customer', 'Broker')),
  quote_accept boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists greenbush_bank (
  id uuid primary key,
  pickup_location text not null,
  destination text not null,
  receiving_hours text,
  price numeric(12,2) not null default 0,
  tarp text,
  remaining_count integer not null default 0 check (remaining_count >= 0),
  special_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists loads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  status load_status not null default 'AVAILABLE',
  account_manager_id uuid references users(id),
  customer_id uuid references customers(id),
  load_ref_number text not null,
  mcleod_order_id text,
  pu_city text not null,
  pu_state text not null,
  pu_zip text,
  pu_date date,
  pu_appt_time text,
  pu_appt boolean not null default false,
  del_city text not null,
  del_state text not null,
  del_zip text,
  del_date date,
  del_appt_time text,
  del_appt boolean not null default false,
  rate numeric(12,2) not null,
  miles numeric(12,2) not null,
  rpm numeric(12,2) not null,
  notes text,
  assigned_dispatcher_id uuid references users(id),
  driver_name text,
  truck_number text,
  reason_log text,
  delay_reason text,
  cancel_reason text,
  deny_quote_reason text,
  other_notes text,
  greenbush_bank_id uuid references greenbush_bank(id),
  check (miles > 0),
  check (rate >= 0),
  check (rpm >= 0)
);

create index if not exists idx_loads_status on loads(status);
create index if not exists idx_loads_dispatcher on loads(assigned_dispatcher_id);
create index if not exists idx_loads_customer on loads(customer_id);
create index if not exists idx_loads_pu_date on loads(pu_date);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trg_customers_updated_at on customers;
create trigger trg_customers_updated_at
before update on customers
for each row
execute function set_updated_at();

drop trigger if exists trg_greenbush_bank_updated_at on greenbush_bank;
create trigger trg_greenbush_bank_updated_at
before update on greenbush_bank
for each row
execute function set_updated_at();
