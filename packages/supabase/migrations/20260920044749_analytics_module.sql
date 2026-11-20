-- ============================================================
-- LUMEN-POS · Fase 6: Analytics
-- 1. cost_price en sale_items (congelar costo al momento de venta)
-- 2. Función create_sale actualizada con cost_price
-- 3. Función get_store_analytics para cálculo de KPIs, tendencias y margen
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columna cost_price en sale_items
-- ------------------------------------------------------------
alter table public.sale_items
  add column if not exists cost_price numeric(10,2) not null default 0;

-- Actualizar filas existentes en sale_items con el cost_price histórico de su variante
update public.sale_items si
set cost_price = pv.cost_price
from public.product_variants pv
where si.product_variant_id = pv.id and si.cost_price = 0;

-- ------------------------------------------------------------
-- 2. create_sale registra el cost_price del momento
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

    if v_variant.stock_quantity < (v_item->>'quantity')::integer then
      raise exception 'Stock insuficiente para "%": disponible %, solicitado %',
        v_variant.name, v_variant.stock_quantity, (v_item->>'quantity')::integer;
    end if;

    v_total := v_total + (v_variant.sale_price * (v_item->>'quantity')::integer);
  end loop;

  insert into public.sales (store_id, cash_register_id, sold_by, customer_id, payment_method, total)
  values (v_store_id, p_cash_register_id, auth.uid(), p_customer_id, p_payment_method, v_total)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_variant
    from public.product_variants
    where id = (v_item->>'product_variant_id')::uuid;

    insert into public.sale_items (sale_id, product_variant_id, quantity, unit_price, cost_price, subtotal)
    values (
      v_sale_id,
      v_variant.id,
      (v_item->>'quantity')::integer,
      v_variant.sale_price,
      v_variant.cost_price,
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
-- 3. Función consolidada de Analíticas por Tienda
-- ------------------------------------------------------------
create or replace function public.get_store_analytics(
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_result jsonb;
  v_summary jsonb;
  v_daily jsonb;
  v_top_products jsonb;
  v_payment_methods jsonb;
begin
  v_store_id := public.get_my_store_id();

  if v_store_id is null then
    raise exception 'No autorizado: tienda no identificada';
  end if;

  -- 1. Resumen general (KPIs)
  select jsonb_build_object(
    'total_sales', coalesce(sum(s.total), 0),
    'total_orders', count(s.id),
    'total_cost', coalesce(sum(items.total_cost), 0),
    'gross_profit', coalesce(sum(s.total), 0) - coalesce(sum(items.total_cost), 0),
    'profit_margin', case
      when coalesce(sum(s.total), 0) > 0 then
        round(((coalesce(sum(s.total), 0) - coalesce(sum(items.total_cost), 0)) / sum(s.total)) * 100, 2)
      else 0
    end,
    'average_ticket', case
      when count(s.id) > 0 then round(coalesce(sum(s.total), 0) / count(s.id), 2)
      else 0
    end,
    'cash_sales', coalesce(sum(case when s.payment_method = 'cash' then s.total else 0 end), 0),
    'card_sales', coalesce(sum(case when s.payment_method = 'card' then s.total else 0 end), 0)
  ) into v_summary
  from public.sales s
  left join (
    select sale_id, sum(quantity * cost_price) as total_cost
    from public.sale_items
    group by sale_id
  ) items on items.sale_id = s.id
  where s.store_id = v_store_id
    and s.created_at >= p_start_date
    and s.created_at <= p_end_date;

  -- 2. Ventas cronológicas por día
  select coalesce(jsonb_agg(d order by d->>'date' asc), '[]'::jsonb)
  into v_daily
  from (
    select jsonb_build_object(
      'date', to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD'),
      'total_sales', coalesce(sum(s.total), 0),
      'total_cost', coalesce(sum(items.total_cost), 0),
      'gross_profit', coalesce(sum(s.total), 0) - coalesce(sum(items.total_cost), 0),
      'orders_count', count(s.id)
    ) as d
    from public.sales s
    left join (
      select sale_id, sum(quantity * cost_price) as total_cost
      from public.sale_items
      group by sale_id
    ) items on items.sale_id = s.id
    where s.store_id = v_store_id
      and s.created_at >= p_start_date
      and s.created_at <= p_end_date
    group by to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD')
  ) sub;

  -- 3. Productos más vendidos con margen real
  select coalesce(jsonb_agg(p), '[]'::jsonb)
  into v_top_products
  from (
    select jsonb_build_object(
      'product_id', pr.id,
      'product_name', pr.name,
      'variant_name', pv.name,
      'category_name', c.name,
      'quantity_sold', sum(si.quantity),
      'revenue', sum(si.subtotal),
      'cost', sum(si.quantity * si.cost_price),
      'gross_profit', sum(si.subtotal) - sum(si.quantity * si.cost_price),
      'profit_margin', case
        when sum(si.subtotal) > 0 then
          round(((sum(si.subtotal) - sum(si.quantity * si.cost_price)) / sum(si.subtotal)) * 100, 2)
        else 0
      end
    ) as p
    from public.sale_items si
    join public.sales s on s.id = si.sale_id
    join public.product_variants pv on pv.id = si.product_variant_id
    join public.products pr on pr.id = pv.product_id
    left join public.categories c on c.id = pr.category_id
    where s.store_id = v_store_id
      and s.created_at >= p_start_date
      and s.created_at <= p_end_date
    group by pr.id, pr.name, pv.name, c.name
    order by sum(si.subtotal) desc
    limit 50
  ) sub;

  -- 4. Desglose por método de pago
  select coalesce(jsonb_agg(m), '[]'::jsonb)
  into v_payment_methods
  from (
    select jsonb_build_object(
      'method', s.payment_method,
      'total', sum(s.total),
      'count', count(s.id)
    ) as m
    from public.sales s
    where s.store_id = v_store_id
      and s.created_at >= p_start_date
      and s.created_at <= p_end_date
    group by s.payment_method
    order by sum(s.total) desc
  ) sub;

  v_result := jsonb_build_object(
    'summary', v_summary,
    'daily_sales', v_daily,
    'top_products', v_top_products,
    'payment_methods', v_payment_methods
  );

  return v_result;
end;
$$;
