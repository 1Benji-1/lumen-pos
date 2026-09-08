-- ============================================================
-- LUMEN-POS · POS: cash_registers, sales, sale_items
-- ============================================================

-- ------------------------------------------------------------
-- 1. CASH_REGISTERS
-- Control de apertura/cierre de caja, obligatorio para vender.
-- ------------------------------------------------------------
create table public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  opened_by uuid not null references public.users(id),
  opening_amount numeric(10,2) not null default 0,
  closing_amount numeric(10,2),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

alter table public.cash_registers enable row level security;

create policy "Ver cajas de mi tienda"
  on public.cash_registers for select
  using (store_id = public.get_my_store_id());

create policy "Abrir caja en mi tienda"
  on public.cash_registers for insert
  with check (store_id = public.get_my_store_id());

create policy "Cerrar caja de mi tienda"
  on public.cash_registers for update
  using (store_id = public.get_my_store_id());

-- ------------------------------------------------------------
-- 2. SALES
-- customer_id se deja listo desde ahora (sin FK todavía) para
-- cuando la Fase 4 cree la tabla "customers" — en ese momento
-- se agrega la relación formal con un ALTER TABLE.
-- ------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id),
  sold_by uuid not null references public.users(id),
  customer_id uuid,
  payment_method text not null check (payment_method in ('cash', 'card', 'credit')),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;

create policy "Ver ventas de mi tienda"
  on public.sales for select
  using (store_id = public.get_my_store_id());

-- No se exponen INSERT/UPDATE directos: toda venta se crea
-- exclusivamente a través de la función create_sale() de abajo,
-- que valida stock y caja abierta de forma atómica.

-- ------------------------------------------------------------
-- 3. SALE_ITEMS
-- ------------------------------------------------------------
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

alter table public.sale_items enable row level security;

create policy "Ver items de ventas de mi tienda"
  on public.sale_items for select
  using (
    sale_id in (
      select id from public.sales where store_id = public.get_my_store_id()
    )
  );

-- ------------------------------------------------------------
-- 4. FUNCIÓN create_sale()
-- Recibe los items como JSON y hace TODO en una sola transacción:
-- 1. Valida que la caja esté abierta y sea de la tienda del usuario
-- 2. Valida que haya stock suficiente de cada variante
-- 3. Crea la venta
-- 4. Crea cada sale_item
-- 5. Descuenta el stock de cada variante
-- Si algo fallara a la mitad, TODO se revierte automáticamente
-- (comportamiento estándar de una función en Postgres).
-- ------------------------------------------------------------
create function public.create_sale(
  p_cash_register_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_customer_id uuid default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_store_id uuid;
  v_sale_id uuid;
  v_item jsonb;
  v_variant record;
  v_total numeric(10,2) := 0;
begin
  v_store_id := public.get_my_store_id();

  -- 1. Validar caja abierta y de mi tienda
  if not exists (
    select 1 from public.cash_registers
    where id = p_cash_register_id
      and store_id = v_store_id
      and status = 'open'
  ) then
    raise exception 'La caja no está abierta o no pertenece a tu tienda';
  end if;

  -- 2. Validar stock suficiente de cada item
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid
      and store_id = v_store_id;

    if v_variant is null then
      raise exception 'Producto no encontrado en tu tienda';
    end if;

    if v_variant.stock_quantity < (v_item->>'quantity')::integer then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_variant.name, v_variant.stock_quantity, (v_item->>'quantity')::integer;
    end if;

    v_total := v_total + (v_variant.sale_price * (v_item->>'quantity')::integer);
  end loop;

  -- 3. Crear la venta
  insert into public.sales (store_id, cash_register_id, sold_by, customer_id, payment_method, total)
  values (v_store_id, p_cash_register_id, auth.uid(), p_customer_id, p_payment_method, v_total)
  returning id into v_sale_id;

  -- 4. Crear cada sale_item y 5. descontar stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid;

    insert into public.sale_items (sale_id, product_variant_id, quantity, unit_price, subtotal)
    values (
      v_sale_id,
      v_variant.id,
      (v_item->>'quantity')::integer,
      v_variant.sale_price,
      v_variant.sale_price * (v_item->>'quantity')::integer
    );

    update public.product_variants
    set stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    where id = v_variant.id;
  end loop;

  return v_sale_id;
end;
$$;

-- ------------------------------------------------------------
-- 5. Índices
-- ------------------------------------------------------------
create index idx_sales_store_id on public.sales(store_id);
create index idx_sales_cash_register_id on public.sales(cash_register_id);
create index idx_sale_items_sale_id on public.sale_items(sale_id);
create index idx_cash_registers_store_id on public.cash_registers(store_id);