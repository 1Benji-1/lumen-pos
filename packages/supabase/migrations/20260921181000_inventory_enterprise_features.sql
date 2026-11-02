-- ============================================================
-- LUMEN-POS · Módulo Inventario: Funcionalidades Enterprise
-- 1. Estado activo / inactivo de producto y variantes
-- 2. Imagen de producto y variantes
-- 3. Unidad de medida (unit, kg, g, l, ml, m)
-- 4. Historial de movimientos de stock (stock_movements)
-- 5. Proveedores (suppliers) y vínculo en variantes
-- 6. Órdenes de compra (purchase_orders y purchase_order_items)
-- 7. Funciones para ajuste de stock y recepción de órdenes de compra
-- 8. Actualización de create_sale para auditar movimientos por venta
-- ============================================================

-- ------------------------------------------------------------
-- 1. Estado activo e imagen en productos y variantes
-- ------------------------------------------------------------
alter table public.products
  add column if not exists is_active boolean not null default true,
  add column if not exists image_url text;

alter table public.product_variants
  add column if not exists is_active boolean not null default true,
  add column if not exists image_url text,
  add column if not exists unit text not null default 'unit' check (unit in ('unit', 'kg', 'g', 'l', 'ml', 'm'));

-- Permitir cantidades decimales para unidades de peso, volumen y longitud
alter table public.product_variants
  alter column stock_quantity type numeric(10,3),
  alter column low_stock_threshold type numeric(10,3);

alter table public.sale_items
  alter column quantity type numeric(10,3);

-- ------------------------------------------------------------
-- 2. Proveedores (suppliers)
-- ------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  tax_id text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "Ver proveedores de mi tienda"
  on public.suppliers for select
  using (store_id = public.get_my_store_id());

create policy "Crear proveedores en mi tienda"
  on public.suppliers for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar proveedores de mi tienda"
  on public.suppliers for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar proveedores de mi tienda"
  on public.suppliers for delete
  using (store_id = public.get_my_store_id());

create index if not exists idx_suppliers_store_id on public.suppliers(store_id);

-- Vincular proveedor a variantes de producto
alter table public.product_variants
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists idx_product_variants_supplier_id on public.product_variants(supplier_id);

-- ------------------------------------------------------------
-- 3. Historial de movimientos de stock (stock_movements)
-- ------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  type text not null check (type in ('sale', 'manual_adjustment', 'waste', 'supplier_return', 'physical_count', 'purchase_order')),
  quantity_change numeric(10,3) not null,
  previous_stock numeric(10,3) not null,
  new_stock numeric(10,3) not null,
  reason text,
  performed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;

create policy "Ver movimientos de stock de mi tienda"
  on public.stock_movements for select
  using (store_id = public.get_my_store_id());

create policy "Crear movimientos de stock en mi tienda"
  on public.stock_movements for insert
  with check (store_id = public.get_my_store_id());

create index if not exists idx_stock_movements_store_id on public.stock_movements(store_id);
create index if not exists idx_stock_movements_variant_id on public.stock_movements(variant_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at desc);

-- ------------------------------------------------------------
-- 4. Órdenes de compra (purchase_orders y purchase_order_items)
-- ------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'received', 'cancelled')),
  total_cost numeric(10,2) not null default 0,
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;

create policy "Ver órdenes de compra de mi tienda"
  on public.purchase_orders for select
  using (store_id = public.get_my_store_id());

create policy "Crear órdenes de compra en mi tienda"
  on public.purchase_orders for insert
  with check (store_id = public.get_my_store_id());

create policy "Editar órdenes de compra de mi tienda"
  on public.purchase_orders for update
  using (store_id = public.get_my_store_id());

create policy "Eliminar órdenes de compra de mi tienda"
  on public.purchase_orders for delete
  using (store_id = public.get_my_store_id());

create index if not exists idx_purchase_orders_store_id on public.purchase_orders(store_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity numeric(10,3) not null check (quantity > 0),
  cost_price numeric(10,2) not null check (cost_price >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0)
);

alter table public.purchase_order_items enable row level security;

create policy "Ver items de orden de compra de mi tienda"
  on public.purchase_order_items for select
  using (purchase_order_id in (select id from public.purchase_orders where store_id = public.get_my_store_id()));

create policy "Crear items de orden de compra en mi tienda"
  on public.purchase_order_items for insert
  with check (purchase_order_id in (select id from public.purchase_orders where store_id = public.get_my_store_id()));

create policy "Editar items de orden de compra en mi tienda"
  on public.purchase_order_items for update
  using (purchase_order_id in (select id from public.purchase_orders where store_id = public.get_my_store_id()));

create policy "Eliminar items de orden de compra en mi tienda"
  on public.purchase_order_items for delete
  using (purchase_order_id in (select id from public.purchase_orders where store_id = public.get_my_store_id()));

create index if not exists idx_purchase_order_items_po_id on public.purchase_order_items(purchase_order_id);
create index if not exists idx_purchase_order_items_variant_id on public.purchase_order_items(variant_id);

-- ------------------------------------------------------------
-- 5. Función atómica para ajustar stock y registrar movimiento
-- ------------------------------------------------------------
create or replace function public.adjust_variant_stock(
  p_variant_id uuid,
  p_new_stock numeric(10,3),
  p_type text,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_variant record;
  v_qty_change numeric(10,3);
  v_movement_id uuid;
begin
  v_store_id := public.get_my_store_id();

  select * into v_variant
  from public.product_variants
  where id = p_variant_id
    and store_id = v_store_id;

  if v_variant is null then
    raise exception 'Variante no encontrada o no pertenece a tu tienda';
  end if;

  if p_new_stock < 0 then
    raise exception 'El nuevo stock no puede ser negativo';
  end if;

  v_qty_change := p_new_stock - v_variant.stock_quantity;

  -- Actualizar stock en la variante
  update public.product_variants
  set stock_quantity = p_new_stock
  where id = v_variant.id;

  -- Insertar movimiento
  insert into public.stock_movements (
    store_id,
    variant_id,
    type,
    quantity_change,
    previous_stock,
    new_stock,
    reason,
    performed_by
  )
  values (
    v_store_id,
    v_variant.id,
    p_type,
    v_qty_change,
    v_variant.stock_quantity,
    p_new_stock,
    p_reason,
    auth.uid()
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- ------------------------------------------------------------
-- 6. Función para recibir orden de compra
-- ------------------------------------------------------------
create or replace function public.receive_purchase_order(
  p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_order record;
  v_item record;
  v_variant record;
begin
  v_store_id := public.get_my_store_id();

  select * into v_order
  from public.purchase_orders
  where id = p_order_id
    and store_id = v_store_id;

  if v_order is null then
    raise exception 'Orden de compra no encontrada';
  end if;

  if v_order.status = 'received' then
    raise exception 'La orden de compra ya fue recibida anteriormente';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'No se puede recibir una orden de compra cancelada';
  end if;

  -- Procesar cada ítem
  for v_item in
    select poi.*, pv.stock_quantity as current_stock
    from public.purchase_order_items poi
    join public.product_variants pv on pv.id = poi.variant_id
    where poi.purchase_order_id = p_order_id
  loop
    -- Actualizar stock y costo de la variante
    update public.product_variants
    set stock_quantity = stock_quantity + v_item.quantity,
        cost_price = v_item.cost_price
    where id = v_item.variant_id;

    -- Registrar movimiento de stock
    insert into public.stock_movements (
      store_id,
      variant_id,
      type,
      quantity_change,
      previous_stock,
      new_stock,
      reason,
      performed_by
    )
    values (
      v_store_id,
      v_item.variant_id,
      'purchase_order',
      v_item.quantity,
      v_item.current_stock,
      v_item.current_stock + v_item.quantity,
      'Recepción de Orden de Compra #' || v_order.order_number,
      auth.uid()
    );
  end loop;

  -- Marcar orden como recibida
  update public.purchase_orders
  set status = 'received',
      received_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- 7. Actualización de create_sale para auditar movimientos de stock
-- ------------------------------------------------------------
create or replace function public.create_sale(
  p_cash_register_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_customer_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_sale_id uuid;
  v_item jsonb;
  v_variant record;
  v_item_qty numeric(10,3);
  v_total numeric(10,2) := 0;
begin
  v_store_id := public.get_my_store_id();

  if not exists (
    select 1 from public.cash_registers
    where id = p_cash_register_id
      and store_id = v_store_id
      and status = 'open'
  ) then
    raise exception 'La caja no está abierta o no pertenece a tu tienda';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid
      and store_id = v_store_id;

    if v_variant is null then
      raise exception 'Producto no encontrado en tu tienda';
    end if;

    if not v_variant.is_active then
      raise exception 'El producto "%" está inactivo para la venta', v_variant.name;
    end if;

    v_item_qty := (v_item->>'quantity')::numeric(10,3);

    if v_variant.stock_quantity < v_item_qty then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_variant.name, v_variant.stock_quantity, v_item_qty;
    end if;

    v_total := v_total + (v_variant.sale_price * v_item_qty);
  end loop;

  insert into public.sales (store_id, cash_register_id, sold_by, customer_id, payment_method, total)
  values (v_store_id, p_cash_register_id, auth.uid(), p_customer_id, p_payment_method, v_total)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid;

    v_item_qty := (v_item->>'quantity')::numeric(10,3);

    insert into public.sale_items (sale_id, product_variant_id, quantity, unit_price, subtotal)
    values (
      v_sale_id,
      v_variant.id,
      v_item_qty,
      v_variant.sale_price,
      v_variant.sale_price * v_item_qty
    );

    update public.product_variants
    set stock_quantity = stock_quantity - v_item_qty
    where id = v_variant.id;

    -- Registrar movimiento por venta
    insert into public.stock_movements (
      store_id,
      variant_id,
      type,
      quantity_change,
      previous_stock,
      new_stock,
      reason,
      performed_by
    )
    values (
      v_store_id,
      v_variant.id,
      'sale',
      -v_item_qty,
      v_variant.stock_quantity,
      v_variant.stock_quantity - v_item_qty,
      'Venta POS',
      auth.uid()
    );
  end loop;

  return v_sale_id;
end;
$$;
