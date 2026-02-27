alter table if exists users
  add column if not exists exclude_from_payroll boolean not null default false;
