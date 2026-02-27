alter table if exists settlement_tier_configs
  add column if not exists broker_load_pay numeric(12,2);

update settlement_tier_configs
set broker_load_pay = 5.00
where broker_load_pay is null;

alter table if exists settlement_tier_configs
  alter column broker_load_pay set default 5.00,
  alter column broker_load_pay set not null;
