alter table public.cash_registers
  add column if not exists notes text;

create or replace function public.admin_force_close_cash_register(
  p_register_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
  v_cash_sales numeric(10,2) := 0;
  v_cash_in numeric(10,2) := 0;
  v_cash_out numeric(10,2) := 0;
  v_expected_cash numeric(10,2) := 0;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_reg
  from public.cash_registers
  where id = p_register_id;

  if v_reg is null then
    raise exception 'Caja registradora no encontrada';
  end if;

  if v_reg.status = 'closed' then
    return;
  end if;

  select coalesce(sum(
    case 
      when sp.id is not null then (case when sp.payment_method = 'cash' then sp.amount else 0 end)
      when s.payment_method = 'cash' then s.total
      else 0
    end
  ), 0)
  into v_cash_sales
  from public.sales s
  left join public.sale_payments sp on sp.sale_id = s.id
  where s.cash_register_id = p_register_id
    and s.status = 'completed';

  select 
    coalesce(sum(case when type = 'in' then amount else 0 end), 0),
    coalesce(sum(case when type = 'out' then amount else 0 end), 0)
  into v_cash_in, v_cash_out
  from public.cash_movements
  where cash_register_id = p_register_id;

  v_expected_cash := greatest(0, coalesce(v_reg.opening_amount, 0) + v_cash_sales + v_cash_in - v_cash_out);

  update public.cash_registers
  set
    status = 'closed',
    closing_amount = v_expected_cash,
    closed_at = now(),
    notes = 'cierre forzado por administrador, sin conteo'
  where id = p_register_id;
end;
$$;
