-- ============================================================
-- LUMEN-POS · Clientes (Ampliación)
-- Migración: Notas, Desactivación lógica, Métricas de frecuencia
-- y detección de duplicados
-- ============================================================

-- 1. Campos adicionales en customers
alter table public.customers 
  add column if not exists is_active boolean not null default true,
  add column if not exists notes text;

create index if not exists idx_customers_store_active on public.customers(store_id, is_active);

-- 2. Vista con métricas operativas por cliente (frecuencia, última compra, total gastado)
create or replace view public.customer_metrics
with (security_invoker = on) as
select 
  c.id,
  c.store_id,
  c.full_name,
  c.phone,
  c.email,
  c.notes,
  c.is_active,
  c.created_at,
  count(s.id) filter (where s.status = 'completed')::int as total_purchases,
  max(s.created_at) filter (where s.status = 'completed') as last_purchase_at,
  coalesce(sum(s.total) filter (where s.status = 'completed'), 0)::numeric(10,2) as total_spent
from public.customers c
left join public.sales s on s.customer_id = c.id
group by c.id;

grant select on public.customer_metrics to authenticated, anon;

-- 3. Función para detectar duplicados por teléfono o email en la tienda
create or replace function public.check_duplicate_customer(
  p_store_id uuid,
  p_phone text default null,
  p_email text default null,
  p_exclude_customer_id uuid default null
)
returns table (
  id uuid,
  full_name text,
  phone text,
  email text,
  matched_by text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_phone text := nullif(trim(p_phone), '');
  v_clean_email text := nullif(lower(trim(p_email)), '');
begin
  if v_clean_phone is null and v_clean_email is null then
    return;
  end if;

  return query
  select 
    c.id,
    c.full_name,
    c.phone,
    c.email,
    case 
      when v_clean_phone is not null and c.phone = v_clean_phone and v_clean_email is not null and lower(c.email) = v_clean_email then 'phone_and_email'
      when v_clean_phone is not null and c.phone = v_clean_phone then 'phone'
      when v_clean_email is not null and lower(c.email) = v_clean_email then 'email'
      else 'unknown'
    end as matched_by
  from public.customers c
  where c.store_id = p_store_id
    and (p_exclude_customer_id is null or c.id <> p_exclude_customer_id)
    and (
      (v_clean_phone is not null and c.phone = v_clean_phone)
      or (v_clean_email is not null and lower(c.email) = v_clean_email)
    )
  limit 1;
end;
$$;

grant execute on function public.check_duplicate_customer to authenticated, anon;
