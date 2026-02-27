alter table if exists settlements
  add column if not exists tier_basis_load_count integer;
