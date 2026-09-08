-- ============================================================
-- LUMEN-POS · Corrección: create_sale debe ser SECURITY DEFINER
-- para poder insertar en sales/sale_items y actualizar stock,
-- ya que esas tablas no tienen políticas de INSERT directas
-- (solo se puede insertar a través de esta función).
-- ============================================================

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