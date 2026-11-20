begin;

-- Keep validated transactional bodies intact. Public entry points authorize
-- the module before delegating; their renamed bodies cannot be called by API roles.
alter function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz) rename to internal_create_sale;
alter function public.refund_sale(uuid,text,uuid) rename to internal_refund_sale;
alter function public.receive_purchase_order(uuid) rename to internal_receive_purchase_order;
alter function public.adjust_variant_stock(uuid,numeric,text,text) rename to internal_adjust_variant_stock;
alter function public.create_product_with_variant(jsonb,jsonb) rename to internal_create_product_with_variant;
alter function public.get_store_analytics(timestamptz,timestamptz) rename to internal_get_store_analytics;
alter function public.check_duplicate_customer(uuid,text,text,uuid) rename to internal_check_duplicate_customer;

revoke all on function public.internal_create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz),
 public.internal_refund_sale(uuid,text,uuid),public.internal_receive_purchase_order(uuid),
 public.internal_adjust_variant_stock(uuid,numeric,text,text),public.internal_create_product_with_variant(jsonb,jsonb),
 public.internal_get_store_analytics(timestamptz,timestamptz),public.internal_check_duplicate_customer(uuid,text,text,uuid)
 from public,anon,authenticated;

create function public.create_sale(
 p_cash_register_id uuid,p_payment_method text,p_items jsonb,p_customer_id uuid default null,
 p_discount numeric default 0,p_payments jsonb default null,p_customer_email text default null,
 p_idempotency_key text default null,p_created_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 tenant uuid:=public.get_my_store_id();
 key text:=nullif(btrim(p_idempotency_key),'');
 prior public.sales;
begin
 if tenant is null or not public.has_store_permission('pos:access') then
   raise exception 'No autorizado para POS' using errcode='42501';
 end if;
 if key is not null then
   if length(key)>200 then raise exception 'Clave de idempotencia demasiado larga'; end if;
   perform pg_advisory_xact_lock(hashtextextended(tenant::text||':'||key,0));
   select * into prior from public.sales where store_id=tenant and idempotency_key=key;
   if found then
     if prior.sold_by is distinct from auth.uid() or prior.cash_register_id is distinct from p_cash_register_id then
       raise exception 'La clave ya está asociada a otro cajero o caja' using errcode='42501';
     end if;
     return prior.id;
   end if;
 end if;
 perform public.require_active_module('pos','pos:access');
 return public.internal_create_sale(p_cash_register_id,p_payment_method,p_items,p_customer_id,
  p_discount,p_payments,p_customer_email,p_idempotency_key,p_created_at);
end $$;

create function public.refund_sale(p_sale_id uuid,p_reason text default null,p_disburse_cash_register_id uuid default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('pos','pos:access');
 return public.internal_refund_sale(p_sale_id,p_reason,p_disburse_cash_register_id);
end $$;

create function public.receive_purchase_order(p_order_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('inventory','inventory:manage');
 return public.internal_receive_purchase_order(p_order_id);
end $$;

create function public.adjust_variant_stock(p_variant_id uuid,p_new_stock numeric,p_type text,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('inventory','inventory:manage');
 return public.internal_adjust_variant_stock(p_variant_id,p_new_stock,p_type,p_reason);
end $$;

create function public.create_product_with_variant(p_product jsonb,p_variant jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('inventory','inventory:manage');
 return public.internal_create_product_with_variant(p_product,p_variant);
end $$;

create function public.get_store_analytics(p_start_date timestamptz,p_end_date timestamptz)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('analytics','analytics:view');
 return public.internal_get_store_analytics(p_start_date,p_end_date);
end $$;

create function public.check_duplicate_customer(p_store_id uuid,p_phone text default null,p_email text default null,p_exclude_customer_id uuid default null)
returns table(id uuid,full_name text,phone text,email text,matched_by text)
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_active_module('customers','customers:manage');
 return query select * from public.internal_check_duplicate_customer(p_store_id,p_phone,p_email,p_exclude_customer_id);
end $$;

revoke all on function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz),
 public.refund_sale(uuid,text,uuid),public.receive_purchase_order(uuid),
 public.adjust_variant_stock(uuid,numeric,text,text),public.create_product_with_variant(jsonb,jsonb),
 public.get_store_analytics(timestamptz,timestamptz),public.check_duplicate_customer(uuid,text,text,uuid)
 from public,anon;
grant execute on function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz),
 public.refund_sale(uuid,text,uuid),public.receive_purchase_order(uuid),
 public.adjust_variant_stock(uuid,numeric,text,text),public.create_product_with_variant(jsonb,jsonb),
 public.get_store_analytics(timestamptz,timestamptz),public.check_duplicate_customer(uuid,text,text,uuid)
 to authenticated;

commit;
