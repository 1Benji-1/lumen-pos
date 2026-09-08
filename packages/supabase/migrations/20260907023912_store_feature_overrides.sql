alter table public.stores
  add column feature_overrides jsonb not null default '{}'::jsonb;