-- Actualización de la función refund_sale para soportar desembolso en caja activa cuando la original ya está cerrada
create or replace function public.refund_sale(
  p_sale_id uuid,
  p_reason text default null,
  p_disburse_cash_register_id uuid default null
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
  v_target_register_id uuid;
  v_target_status text;
  v_register_note text := '';
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

  if v_cash_paid = 0 and v_sale.payment_method = 'cash' then
    v_cash_paid := coalesce(v_sale.total, 0);
  end if;

  if v_cash_paid > 0 then
    -- Determinar caja de desembolso
    if p_disburse_cash_register_id is not null then
      select status into v_target_status
      from public.cash_registers
      where id = p_disburse_cash_register_id and store_id = v_store_id;

      if v_target_status is null then
        raise exception 'La caja especificada para el desembolso no existe';
      end if;

      v_target_register_id := p_disburse_cash_register_id;
      v_register_note := ' (Desembolsado en caja activa)';
    else
      -- Revisar si la caja original sigue abierta
      select status into v_target_status
      from public.cash_registers
      where id = v_sale.cash_register_id;

      if v_target_status = 'open' then
        v_target_register_id := v_sale.cash_register_id;
      else
        -- Buscar si el usuario actual tiene una caja abierta
        select id into v_target_register_id
        from public.cash_registers
        where store_id = v_store_id and opened_by = auth.uid() and status = 'open'
        order by opened_at desc
        limit 1;

        if v_target_register_id is null then
          -- Fallback a cualquier caja abierta de la tienda
          select id into v_target_register_id
          from public.cash_registers
          where store_id = v_store_id and status = 'open'
          order by opened_at desc
          limit 1;
        end if;

        -- Si no hay ninguna caja abierta en absoluto, asociar a la original
        if v_target_register_id is null then
          v_target_register_id := v_sale.cash_register_id;
          v_register_note := ' (Caja original cerrada, sin cajas abiertas activas)';
        else
          v_register_note := ' (Caja original cerrada; egreso registrado en caja activa)';
        end if;
      end if;
    end if;

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
      v_target_register_id,
      auth.uid(),
      'out',
      v_cash_paid,
      'Devolución de efectivo por Venta #' || p_sale_id || v_register_note || coalesce(' — Motivo: ' || p_reason, '')
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
