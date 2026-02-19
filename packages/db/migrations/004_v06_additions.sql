-- V0.6 additions

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

alter table if exists users
  add column if not exists full_load_access boolean not null default false;

alter table if exists greenbush_bank
  add column if not exists reserved_count integer not null default 0;

alter table if exists customers
  add column if not exists quote_accept boolean not null default false;

alter table if exists loads
  add column if not exists mcleod_order_id text,
  add column if not exists deny_quote_reason text,
  add column if not exists other_notes text,
  add column if not exists equipment text,
  add column if not exists delay_reason text,
  add column if not exists cancel_reason text,
  add column if not exists pu_appt boolean not null default false,
  add column if not exists del_appt boolean not null default false;
