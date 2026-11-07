alter table public.stores
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists grace_period_days integer not null default 5;

update public.stores
set subscription_ends_at = coalesce(trial_ends_at, now() + interval '30 days')
where subscription_status = 'active'
  and subscription_ends_at is null;

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('transfer', 'qr', 'cash')),
  reference text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_payments_store_id on public.subscription_payments(store_id);
create index if not exists idx_stores_subscription_ends_at on public.stores(subscription_ends_at);

alter table public.subscription_payments enable row level security;

drop policy if exists "Super admins pueden gestionar pagos de suscripción" on public.subscription_payments;
create policy "Super admins pueden gestionar pagos de suscripción"
  on public.subscription_payments
  for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Tiendas pueden ver sus propios pagos de suscripción" on public.subscription_payments;
create policy "Tiendas pueden ver sus propios pagos de suscripción"
  on public.subscription_payments
  for select
  using (store_id = public.get_my_store_id());

create or replace function public.admin_record_payment_and_renew(
  p_store_id uuid,
  p_amount numeric(10,2),
  p_payment_method text,
  p_reference text default null,
  p_manual_end_date timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store record;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_payment_id uuid;
  v_cycle text;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_store from public.stores where id = p_store_id;
  if v_store is null then
    raise exception 'Tienda no encontrada';
  end if;

  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  v_cycle := coalesce(v_store.billing_cycle, 'monthly');

  if p_manual_end_date is not null then
    if p_manual_end_date <= now() then
      raise exception 'La fecha manual debe ser posterior a la fecha actual';
    end if;
    v_start_date := coalesce(greatest(v_store.subscription_ends_at, now()), now());
    v_end_date := p_manual_end_date;
  else
    if v_store.subscription_ends_at is not null and v_store.subscription_ends_at > now() then
      v_start_date := v_store.subscription_ends_at;
    else
      v_start_date := now();
    end if;

    if v_cycle = 'annual' then
      v_end_date := v_start_date + interval '1 year';
    elsif v_cycle = 'semiannual' then
      v_end_date := v_start_date + interval '6 months';
    else
      v_end_date := v_start_date + interval '1 month';
    end if;
  end if;

  insert into public.subscription_payments (
    store_id,
    amount,
    payment_method,
    reference,
    period_start,
    period_end,
    paid_at,
    recorded_by,
    notes
  ) values (
    p_store_id,
    p_amount,
    p_payment_method,
    p_reference,
    v_start_date,
    v_end_date,
    now(),
    auth.uid(),
    p_notes
  ) returning id into v_payment_id;

  update public.stores
  set
    subscription_ends_at = v_end_date,
    subscription_status = 'active'
  where id = p_store_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'subscription_ends_at', v_end_date,
    'period_start', v_start_date
  );
end;
$$;

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

  select coalesce(allow_negative_stock, false) into v_allow_negative_stock
  from public.store_settings
  where store_id = v_store_id;

  if not exists (
    select 1 from public.cash_registers
    where id = p_cash_register_id
      and store_id = v_store_id
  ) then
    raise exception 'La caja no pertenece a tu tienda';
  end if;

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

    if v_variant.name is not null and v_variant.name <> '' and v_variant.name <> 'Único' then
      v_display_name := v_variant.product_name || ' (' || v_variant.name || ')';
    else
      v_display_name := v_variant.product_name;
    end if;

    if not v_allow_negative_stock and v_variant.stock_quantity < v_item_qty then
      raise exception 'Stock insuficiente para el producto "%" (disponible: %, solicitado: %)',
        v_display_name, v_variant.stock_quantity, v_item_qty;
    end if;

    v_item_price := (v_item->>'unit_price')::numeric(10,2);
    v_item_discount := coalesce((v_item->>'discount')::numeric(10,2), 0);
    v_item_subtotal := (v_item_qty * v_item_price) - v_item_discount;
    v_total_items_subtotal := v_total_items_subtotal + v_item_subtotal;
  end loop;

  v_final_total := v_total_items_subtotal - coalesce(p_discount, 0);
  if v_final_total < 0 then
    v_final_total := 0;
  end if;

  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      v_payment_sum := v_payment_sum + (v_payment->>'amount')::numeric(10,2);
    end loop;

    if abs(v_payment_sum - v_final_total) > 0.05 then
      raise exception 'La suma de pagos mixtos (%) no coincide con el total de la venta (%)',
        v_payment_sum, v_final_total;
    end if;
  end if;

  insert into public.sales (
    store_id,
    cash_register_id,
    customer_id,
    payment_method,
    total,
    status
  ) values (
    v_store_id,
    p_cash_register_id,
    p_customer_id,
    p_payment_method,
    v_final_total,
    'completed'
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_qty := (v_item->>'quantity')::numeric(10,3);
    v_item_price := (v_item->>'unit_price')::numeric(10,2);
    v_item_discount := coalesce((v_item->>'discount')::numeric(10,2), 0);
    v_item_subtotal := (v_item_qty * v_item_price) - v_item_discount;

    insert into public.sale_items (
      sale_id,
      product_variant_id,
      quantity,
      unit_price,
      subtotal
    ) values (
      v_sale_id,
      (v_item->>'product_variant_id')::uuid,
      v_item_qty,
      v_item_price,
      v_item_subtotal
    );

    select pv.*, p.name as product_name
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = (v_item->>'product_variant_id')::uuid;

    update public.product_variants
    set stock_quantity = stock_quantity - v_item_qty
    where id = (v_item->>'product_variant_id')::uuid;

    insert into public.stock_movements (
      store_id,
      variant_id,
      type,
      quantity_change,
      previous_stock,
      new_stock,
      reason,
      performed_by
    ) values (
      v_store_id,
      (v_item->>'product_variant_id')::uuid,
      'sale',
      -v_item_qty,
      v_variant.stock_quantity,
      v_variant.stock_quantity - v_item_qty,
      'Venta ' || v_sale_id,
      auth.uid()
    );
  end loop;

  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_payment in select * from jsonb_array_elements(p_payments)
    loop
      insert into public.sale_payments (
        sale_id,
        payment_method,
        amount
      ) values (
        v_sale_id,
        v_payment->>'payment_method',
        (v_payment->>'amount')::numeric(10,2)
      );
    end loop;
  end if;

  return v_sale_id;
end;
$$;


CREATE OR REPLACE FUNCTION public.get_admin_stores_overview()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(store_row), '[]'::jsonb)
  FROM (
    SELECT
      s.id,
      s.name,
      s.owner_id,
      s.business_type,
      s.industry_sub_type,
      s.plan_id,
      s.subscription_status,
      s.billing_cycle,
      s.trial_ends_at,
      s.subscription_ends_at,
      s.grace_period_days,
      s.created_at,
      s.feature_overrides,
      p.code as plan_code,
      p.name as plan_name,
      coalesce(p.features, '{}'::jsonb) as plan_features,
      u_owner.full_name as owner_name,
      u_owner.email as owner_email,
      (SELECT count(*)::int FROM public.products p_sub WHERE p_sub.store_id = s.id) as products_count,
      (SELECT max(sa.created_at) FROM public.sales sa WHERE sa.status = 'completed' AND sa.store_id = s.id) as last_sale_at,
      (SELECT count(*)::int FROM public.cash_registers cr WHERE cr.store_id = s.id AND cr.status = 'open') as open_registers_count,
      (SELECT count(*)::int FROM public.users u_count WHERE u_count.store_id = s.id AND u_count.is_active = true) as active_users_count,
      (SELECT count(*)::int FROM public.customers c_sub WHERE c_sub.store_id = s.id) as customers_count
    FROM public.stores s
    LEFT JOIN public.plans p ON p.id = s.plan_id
    LEFT JOIN LATERAL (
      SELECT full_name, email FROM public.users u
      WHERE u.store_id = s.id AND (u.role = 'owner' OR u.id = s.owner_id)
      ORDER BY (u.role = 'owner') DESC, u.created_at ASC
      LIMIT 1
    ) u_owner ON true
    ORDER BY s.created_at DESC
  ) store_row;
$$;
