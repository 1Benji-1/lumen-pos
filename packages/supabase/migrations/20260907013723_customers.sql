-- ============================================================
-- LUMEN-POS · Clientes
-- Solo listado + historial de compras, SIN crédito/fiado
-- (las tiendas objetivo no usan esa modalidad).
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "Ver clientes de mi tienda"
  on public.customers for select
  using (store_id = public.get_my_store_id());

create policy "Crear clientes en mi tienda"
  on public.customers for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar clientes de mi tienda"
  on public.customers for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar clientes de mi tienda"
  on public.customers for delete
  using (store_id = public.get_my_store_id());

-- ------------------------------------------------------------
-- Ahora que existe "customers", conectamos formalmente la
-- columna customer_id de "sales" (que dejamos suelta desde la
-- Fase 3) con una relación real de llave foránea.
-- ------------------------------------------------------------
alter table public.sales
  add constraint sales_customer_id_fkey
  foreign key (customer_id) references public.customers(id)
  on delete set null;

create index idx_customers_store_id on public.customers(store_id);
create index idx_sales_customer_id on public.sales(customer_id);