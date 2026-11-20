-- ============================================================
-- LUMEN-POS · Módulo POS: Funcionalidades Enterprise
-- 1. Descuentos por ítem y global
-- 2. Devoluciones y anulación de ventas (reversión de stock)
-- 3. Pagos divididos y múltiples métodos de pago (sale_payments)
-- 4. Métodos de pago QR y Transferencia
-- 5. Función atómica refund_sale
-- ============================================================

-- ------------------------------------------------------------
-- 1. Mejoras a la tabla public.sales
-- ------------------------------------------------------------
-- Eliminar restricción rígida previa de métodos de pago
alter table public.sales
  drop constraint if exists sales_payment_method_check;

alter table public.sales
  add constraint sales_payment_method_check
  check (payment_method in ('cash', 'card', 'qr', 'transfer', 'split'));

alter table public.sales
  add column if not exists subtotal numeric(10,2) not null default 0,
  add column if not exists discount numeric(10,2) not null default 0,
  add column if not exists status text not null default 'completed' check (status in ('completed', 'refunded', 'cancelled')),
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_by uuid references public.users(id) on delete set null,
  add column if not exists customer_email text;

create index if not exists idx_sales_status on public.sales(status);

-- ------------------------------------------------------------
-- 2. Mejoras a public.sale_items (descuentos por línea)
-- ------------------------------------------------------------
alter table public.sale_items
  add column if not exists discount numeric(10,2) not null default 0;

-- ------------------------------------------------------------
-- 3. Tabla de pagos detallados (múltiples métodos / pagos divididos)
-- ------------------------------------------------------------
create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'card', 'qr', 'transfer')),
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.sale_payments enable row level security;

create policy "Ver pagos de ventas de mi tienda"
  on public.sale_payments for select
  using (store_id = public.get_my_store_id());

create policy "Crear pagos de ventas en mi tienda"
  on public.sale_payments for insert
  with check (store_id = public.get_my_store_id());

create index if not exists idx_sale_payments_sale_id on public.sale_payments(sale_id);
create index if not exists idx_sale_payments_store_id on public.sale_payments(store_id);

-- ------------------------------------------------------------
-- 4. Actualización de create_sale con descuentos y split payments
-- ------------------------------------------------------------
drop function if exists public.create_sale(uuid, text, jsonb, uuid);

create or replace function public.create_sale(
  p_cash_register_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_payments jsonb default null,
  p_customer_email text default null
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
  v_item_price numeric(10,2);
  v_item_discount numeric(10,2);
  v_item_subtotal numeric(10,2);
  v_total_items_subtotal numeric(10,2) := 0;
  v_final_total numeric(10,2) := 0;
  v_payment jsonb;
  v_payment_sum numeric(10,2) := 0;
  v_allow_negative_stock boolean := false;
  v_display_name text;
begin
  v_store_id := public.get_my_store_id();

  -- Obtener configuración de venta sin stock de la tienda
  select coalesce(allow_negative_stock, false) into v_allow_negative_stock
  from public.store_settings
  where store_id = v_store_id;

  -- Validar caja abierta
  if not exists (
    select 1 from public.cash_registers
    where id = p_cash_register_id
      and store_id = v_store_id
      and status = 'open'
  ) then
    raise exception 'La caja no está abierta o no pertenece a tu tienda';
  end if;

  -- 1. Validar existencias y calcular subtotales de ítems
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select pv.*, p.name as product_name
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item->>'product_variant_id')::uuid
      and pv.store_id = v_store_id;

    if v_variant is null then
      raise exception 'Producto no encontrado en tu tienda';
    end if;

    if not v_variant.is_active then
      raise exception 'El producto "%" está inactivo para la venta', coalesce(v_variant.product_name, v_variant.name);
    end if;

    v_item_qty := (v_item->>'quantity')::numeric(10,3);

    -- Determinar nombre legible del producto
    if v_variant.name is not null and v_variant.name <> '' and v_variant.name <> 'Único' then
      v_display_name := v_variant.product_name || ' (' || v_variant.name || ')';
    else
      v_display_name := v_variant.product_name;
    end if;

    -- Validar existencias si la tienda no permite vender en negativo
    if not v_allow_negative_stock and v_variant.stock_quantity < v_item_qty then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_display_name, v_variant.stock_quantity, v_item_qty;
    end if;

    v_item_price := coalesce((v_item->>'unit_price')::numeric(10,2), v_variant.sale_price);
    v_item_discount := coalesce((v_item->>'discount')::numeric(10,2), 0);
    v_item_subtotal := (v_item_price * v_item_qty) - v_item_discount;
    if v_item_subtotal < 0 then
      v_item_subtotal := 0;
    end if;

    v_total_items_subtotal := v_total_items_subtotal + v_item_subtotal;
  end loop;

  -- 2. Calcular total final con descuento global
  v_final_total := v_total_items_subtotal - coalesce(p_discount, 0);
  if v_final_total < 0 then
    v_final_total := 0;
  end if;

  -- 3. Validar pagos
  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      v_payment_sum := v_payment_sum + (v_payment->>'amount')::numeric(10,2);
    end loop;

    if abs(v_payment_sum - v_final_total) > 0.05 then
      raise exception 'La suma de los pagos (Bs %) no coincide con el total de la venta (Bs %)',
        v_payment_sum, v_final_total;
    end if;
  end if;

  -- 4. Registrar venta
  insert into public.sales (
    store_id,
    cash_register_id,
    sold_by,
    customer_id,
    payment_method,
    subtotal,
    discount,
    total,
    status,
    customer_email
  )
  values (
    v_store_id,
    p_cash_register_id,
    auth.uid(),
    p_customer_id,
    p_payment_method,
    v_total_items_subtotal,
    coalesce(p_discount, 0),
    v_final_total,
    'completed',
    p_customer_email
  )
  returning id into v_sale_id;

  -- 5. Registrar pagos individuales
  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      insert into public.sale_payments (
        sale_id,
        store_id,
        payment_method,
        amount
      )
      values (
        v_sale_id,
        v_store_id,
        v_payment->>'payment_method',
        (v_payment->>'amount')::numeric(10,2)
      );
    end loop;
  else
    -- Si es pago simple, registrar un solo pago equivalente al total
    insert into public.sale_payments (
      sale_id,
      store_id,
      payment_method,
      amount
    )
    values (
      v_sale_id,
      v_store_id,
      p_payment_method,
      v_final_total
    );
  end if;

  -- 6. Insertar ítems, descontar existencias y generar movimientos de auditoría
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid;

    v_item_qty := (v_item->>'quantity')::numeric(10,3);
    v_item_price := coalesce((v_item->>'unit_price')::numeric(10,2), v_variant.sale_price);
    v_item_discount := coalesce((v_item->>'discount')::numeric(10,2), 0);
    v_item_subtotal := (v_item_price * v_item_qty) - v_item_discount;
    if v_item_subtotal < 0 then
      v_item_subtotal := 0;
    end if;

    insert into public.sale_items (
      sale_id,
      product_variant_id,
      quantity,
      unit_price,
      discount,
      subtotal,
      cost_price
    )
    values (
      v_sale_id,
      v_variant.id,
      v_item_qty,
      v_item_price,
      v_item_discount,
      v_item_subtotal,
      v_variant.cost_price
    );

    update public.product_variants
    set stock_quantity = stock_quantity - v_item_qty
    where id = v_variant.id;

    -- Auditoría de movimiento
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
      'Venta POS #' || v_sale_id,
      auth.uid()
    );
  end loop;

  return v_sale_id;
end;
$$;

-- ------------------------------------------------------------
-- 5. Función atómica para anulación / devolución de ventas
-- ------------------------------------------------------------
create or replace function public.refund_sale(
  p_sale_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_sale record;
  v_item record;
  v_variant record;
  v_cash_paid numeric(10,2) := 0;
begin
  v_store_id := public.get_my_store_id();

  select * into v_sale
  from public.sales
  where id = p_sale_id
    and store_id = v_store_id;

  if v_sale is null then
    raise exception 'Venta no encontrada en tu tienda';
  end if;

  if v_sale.status != 'completed' then
    raise exception 'La venta ya fue anulada o reembolsada previamente';
  end if;

  -- 1. Reingresar existencias de cada producto y auditar
  for v_item in
    select si.*, pv.stock_quantity as current_stock, pv.name as var_name
    from public.sale_items si
    join public.product_variants pv on pv.id = si.product_variant_id
    where si.sale_id = p_sale_id
  loop
    update public.product_variants
    set stock_quantity = stock_quantity + v_item.quantity
    where id = v_item.product_variant_id;

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
      v_item.product_variant_id,
      'manual_adjustment',
      v_item.quantity,
      v_item.current_stock,
      v_item.current_stock + v_item.quantity,
      'Devolución de Venta #' || p_sale_id || coalesce(' — Motivo: ' || p_reason, ''),
      auth.uid()
    );
  end loop;

  -- 2. Si hubo pagos en efectivo, registrar salida de caja para cuadre exacto
  select coalesce(sum(amount), 0) into v_cash_paid
  from public.sale_payments
  where sale_id = p_sale_id
    and payment_method = 'cash';

  if v_cash_paid > 0 then
    insert into public.cash_movements (
      store_id,
      cash_register_id,
      performed_by,
      type,
      amount,
      reason
    )
    values (
      v_store_id,
      v_sale.cash_register_id,
      auth.uid(),
      'out',
      v_cash_paid,
      'Devolución de dinero en efectivo por Venta #' || p_sale_id
    );
  end if;

  -- 3. Actualizar estado de la venta
  update public.sales
  set status = 'refunded',
      refund_reason = coalesce(p_reason, 'Devolución de venta'),
      refunded_at = now(),
      refunded_by = auth.uid()
  where id = p_sale_id;

  return true;
end;
$$;
