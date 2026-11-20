-- ============================================================
-- LUMEN-POS · Mejoras a Fase 2 (Inventario) y Fase 3 (POS y Caja)
-- 1. Control opcional de lotes y fecha de caducidad en product_variants
-- 2. Ingresos y retiros de efectivo durante el turno (cash_movements)
-- 3. Habilitación de cajas simultáneas en planes Pro/Enterprise
-- ============================================================

-- ------------------------------------------------------------
-- 1. Lotes y fecha de caducidad en variantes
-- ------------------------------------------------------------
alter table public.product_variants
  add column if not exists track_batch boolean not null default false,
  add column if not exists batch_number text,
  add column if not exists expiry_date date;

create index if not exists idx_product_variants_expiry_date
  on public.product_variants(expiry_date)
  where expiry_date is not null;

-- ------------------------------------------------------------
-- 2. Movimientos de efectivo en caja (ingresos y retiros)
-- ------------------------------------------------------------
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  amount numeric(10,2) not null check (amount > 0),
  reason text not null,
  performed_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.cash_movements enable row level security;

create policy "Ver movimientos de caja de mi tienda"
  on public.cash_movements for select
  using (store_id = public.get_my_store_id());

create policy "Crear movimientos de caja en mi tienda"
  on public.cash_movements for insert
  with check (
    store_id = public.get_my_store_id()
    and performed_by = auth.uid()
  );

create index idx_cash_movements_cash_register_id on public.cash_movements(cash_register_id);
create index idx_cash_movements_store_id on public.cash_movements(store_id);

-- ------------------------------------------------------------
-- 3. Configuración de cajas simultáneas por plan
-- Standard: una sola caja activa por tienda.
-- Pro y Enterprise: cajas simultáneas por usuario.
-- ------------------------------------------------------------
update public.plans
set features = features || '{"multiple_cash_registers": false}'::jsonb
where code = 'standard';

update public.plans
set features = features || '{"multiple_cash_registers": true}'::jsonb
where code in ('pro', 'enterprise');
