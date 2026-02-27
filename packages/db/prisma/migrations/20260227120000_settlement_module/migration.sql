-- Settlement module

alter table if exists users
  add column if not exists default_flat_pay numeric(12,2);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_calculation_method') then
    create type settlement_calculation_method as enum ('PU', 'DELIVERY');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_status') then
    create type settlement_status as enum ('ACTIVE', 'OVERRIDDEN');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_load_entry_type') then
    create type settlement_load_entry_type as enum ('BROKER', 'DIRECT_EXCEPTION', 'DIRECT_STANDARD', 'EXCLUDED_TONU', 'CROSS_MONTH');
  end if;
end $$;

create table if not exists settlement_tier_configs (
  id uuid primary key,
  version integer not null unique,
  is_active boolean not null default false,
  tier1_max_load integer not null,
  tier1_rate numeric(12,2) not null,
  tier2_max_load integer not null,
  tier2_rate numeric(12,2) not null,
  tier3_rate numeric(12,2) not null,
  created_by_user_id uuid references users(id) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists settlement_direct_customer_exceptions (
  id uuid primary key,
  customer_id uuid not null unique references customers(id) on update cascade on delete cascade,
  created_by_user_id uuid references users(id) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists settlements (
  id uuid primary key,
  user_id uuid not null references users(id) on update cascade on delete cascade,
  month integer not null,
  year integer not null,
  calculation_method settlement_calculation_method not null,
  status settlement_status not null default 'ACTIVE',
  overridden_at timestamptz,
  overridden_by_user_id uuid references users(id) on update cascade on delete set null,
  superseded_by_settlement_id uuid references settlements(id) on update cascade on delete set null,
  default_flat_pay numeric(12,2) not null,
  broker_load_count integer not null default 0,
  direct_exception_load_count integer not null default 0,
  direct_standard_load_count integer not null default 0,
  tier_applied integer not null,
  tier_rate numeric(12,2) not null,
  total_load_compensation numeric(12,2) not null,
  total_settlement_amount numeric(12,2) not null,
  excluded_loads_json jsonb not null default '[]'::jsonb,
  cross_month_loads_json jsonb not null default '[]'::jsonb,
  generated_by_user_id uuid not null references users(id) on update cascade on delete restrict,
  tier_version integer not null references settlement_tier_configs(version),
  created_at timestamptz not null default now(),
  check (month between 1 and 12),
  check (year >= 2000)
);

create table if not exists settlement_load_entries (
  id uuid primary key,
  settlement_id uuid not null references settlements(id) on update cascade on delete cascade,
  user_id uuid not null references users(id) on update cascade on delete cascade,
  load_id uuid references loads(id) on update cascade on delete set null,
  entry_type settlement_load_entry_type not null,
  compensation_amount numeric(12,2) not null,
  customer_type_snapshot text,
  status_snapshot load_status,
  revenue_snapshot numeric(12,2) not null,
  pu_date_snapshot date,
  del_date_snapshot date,
  load_ref_number_snapshot text,
  mcleod_order_id_snapshot text,
  customer_name_snapshot text,
  previous_settlement_id uuid references settlements(id) on update cascade on delete set null,
  previous_settlement_month integer,
  previous_settlement_year integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_settlement_tier_configs_is_active
  on settlement_tier_configs(is_active);

create index if not exists idx_settlements_user_month_year
  on settlements(user_id, year, month);

create index if not exists idx_settlements_tier_version
  on settlements(tier_version);

create unique index if not exists idx_settlements_active_unique
  on settlements(user_id, month, year, calculation_method)
  where status = 'ACTIVE'::settlement_status;

create index if not exists idx_settlement_load_entries_settlement_id
  on settlement_load_entries(settlement_id);

create index if not exists idx_settlement_load_entries_load_id
  on settlement_load_entries(load_id);

create index if not exists idx_settlement_load_entries_user_id
  on settlement_load_entries(user_id);
