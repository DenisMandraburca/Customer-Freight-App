do $$
begin
  alter type user_role add value if not exists 'ADMIN';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type user_role add value if not exists 'VIEWER';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type load_status add value if not exists 'PENDING_APPROVAL';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type load_status add value if not exists 'QUOTE_SUBMITTED';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type load_status add value if not exists 'DELAYED';
exception
  when duplicate_object then null;
end $$;

alter table if exists loads
  add column if not exists requested_pickup_date date,
  add column if not exists equipment text,
  add column if not exists legacy_id text;

alter table if exists greenbush_bank
  add column if not exists legacy_id text;

create unique index if not exists idx_loads_legacy_id_unique
  on loads(legacy_id)
  where legacy_id is not null;

create unique index if not exists idx_greenbush_legacy_id_unique
  on greenbush_bank(legacy_id)
  where legacy_id is not null;
