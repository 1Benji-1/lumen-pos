begin;
-- Corrective, additive stabilization. Historical migrations remain immutable.
-- Identity helpers fail closed for disabled or missing profiles.
create or replace function public.get_my_store_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
 select store_id from public.users where id=auth.uid() and is_active;
$$;
create or replace function public.get_my_role() returns text
language sql stable security definer set search_path = public, pg_temp as $$
 select role from public.users where id=auth.uid() and is_active;
$$;
create or replace function public.is_store_admin_or_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
 select coalesce(public.get_my_role() in ('owner','admin'),false);
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
 select auth.uid() is not null
  and coalesce(auth.jwt()->'app_metadata'->>'is_super_admin','false')='true'
  and not exists(select 1 from public.users where id=auth.uid() and not is_active)
  and (coalesce(auth.jwt()->>'aal','aal1')='aal2'
   or not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified'));
$$;
create or replace function public.store_features(p_store_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
 select coalesce(p.features,'{}'::jsonb)||coalesce(s.feature_overrides,'{}'::jsonb)
 from public.stores s left join public.plans p on p.id=s.plan_id where s.id=p_store_id;
$$;
-- Not exposed: callers can only obtain their own tenant through require_store_role.
revoke all on function public.store_features(uuid) from public, anon, authenticated;
create or replace function public.require_store_role(p_roles text[],p_feature text default null) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare s public.stores; tenant uuid:=public.get_my_store_id();
begin
 if tenant is null or not coalesce(public.get_my_role()=any(p_roles),false) then
  raise exception 'No autorizado: rol activo requerido' using errcode='42501';
 end if;
 select * into s from public.stores where id=tenant;
 if not ((s.subscription_status='trialing' and s.trial_ends_at>now())
   or (s.subscription_status in ('active','past_due') and s.subscription_ends_at is not null
    and s.subscription_ends_at+make_interval(days=>greatest(0,s.grace_period_days))>now())) then
  raise exception 'Suscripción no habilitada para operar' using errcode='42501';
 end if;
 if p_feature is not null and not coalesce((public.store_features(tenant)->>p_feature)::boolean,false) then
  raise exception 'El plan no habilita %',p_feature using errcode='42501';
 end if;
 return tenant;
end $$;
-- Guard sensitive columns, including old permissive policies that OR together.
create or replace function public.guard_profile_write() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare actor_role text:=public.get_my_role(); tenant uuid; max_users integer;
begin
 tenant:=case when TG_OP='DELETE' then old.store_id else new.store_id end;
 if current_user in ('authenticated','anon') and not public.is_super_admin() then
  if TG_OP='UPDATE' then
   if new.store_id is distinct from old.store_id or new.id is distinct from old.id then
    raise exception 'No se puede cambiar identidad o tienda' using errcode='42501';
   end if;
   if old.id=auth.uid() and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    raise exception 'No puedes cambiar tu propio rol o estado' using errcode='42501';
   end if;
   if old.id<>auth.uid() and (actor_role not in ('owner','admin') or actor_role is null) then
    raise exception 'No autorizado para gestionar personal' using errcode='42501';
   end if;
   if actor_role='admin' and old.id<>auth.uid() and (old.role in ('admin','owner') or new.role in ('admin','owner')) then
    raise exception 'Un administrador no puede asignar o gestionar administradores/propietarios' using errcode='42501';
   end if;
  elsif TG_OP='INSERT' then
   -- Initial owner only for the actual store owner with no previous profile.
   if not coalesce((new.id=auth.uid() and new.role='owner' and new.is_active
      and exists(select 1 from public.stores where id=new.store_id and owner_id=auth.uid())
      and actor_role is null)
    or (tenant=public.get_my_store_id() and actor_role in ('owner','admin')
      and (actor_role='owner' or new.role in ('cashier','stock_clerk'))),false) then
    raise exception 'No autorizado para crear perfil' using errcode='42501';
   end if;
  end if;
 end if;
 if TG_OP<>'DELETE' and new.is_active and (TG_OP='INSERT' or not old.is_active or new.store_id<>old.store_id) then
  -- Also enforced for service_role writes used by Edge Functions.
  perform 1 from public.stores where id=tenant for update;
  max_users:=coalesce((public.internal_store_features(tenant)->>'max_users')::integer,2);
  if (select count(*) from public.users where store_id=tenant and is_active and id<>new.id)>=max_users then
   raise exception 'Límite de usuarios activos alcanzado' using errcode='23514';
  end if;
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
-- The trigger needs features while keeping the general cross-tenant reader private.
create or replace function public.internal_store_features(p_store_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
 select public.store_features(p_store_id)
 where p_store_id=public.get_my_store_id() or public.is_super_admin()
  or current_setting('role',true) not in ('authenticated','anon');
$$;
create trigger stabilize_profile_write before insert or update or delete on public.users
for each row execute function public.guard_profile_write();
create or replace function public.guard_store_write() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
 if current_user in ('authenticated','anon') and not public.is_super_admin() then
  if TG_OP='INSERT' then
   if new.owner_id is distinct from auth.uid() or public.get_my_store_id() is not null
    or new.subscription_status<>'trialing' or new.feature_overrides<>'{}'::jsonb
    or new.subscription_ends_at is not null or new.grace_period_days<>5
    or new.trial_ends_at>now()+interval '14 days' then
    raise exception 'Registro de tienda no autorizado' using errcode='42501';
   end if;
  else
   if public.get_my_role()<>'owner' or public.get_my_role() is null then
    raise exception 'Solo el propietario puede modificar la tienda' using errcode='42501';
   end if;
   if (to_jsonb(new)-array['name','business_type','industry_sub_type']) is distinct from
      (to_jsonb(old)-array['name','business_type','industry_sub_type']) then
    raise exception 'Solo administración puede modificar la suscripción' using errcode='42501';
   end if;
  end if;
 end if;
 return new;
end $$;
create trigger stabilize_store_write before insert or update on public.stores
for each row execute function public.guard_store_write();
-- Composite keys enforce tenancy independently of RLS and SECURITY DEFINER.
-- NOT VALID preserves legacy data; every new/changed reference is still checked.
do $$declare tab text; begin
 foreach tab in array array['users','categories','products','product_variants','suppliers','cash_registers','customers','sales','purchase_orders'] loop
  execute format('alter table public.%I add constraint %I unique(id,store_id)',tab,tab||'_id_store_key');
 end loop;
end $$;
-- Replace the original FK instead of adding a parallel relationship: PostgREST
-- embeds and explicit !constraint_name hints retain one unambiguous path.
alter table public.products drop constraint products_category_id_fkey;
alter table public.products add constraint products_category_id_fkey foreign key(category_id,store_id) references public.categories(id,store_id) on delete set null (category_id) not valid;
alter table public.product_variants drop constraint product_variants_product_id_fkey;
alter table public.product_variants add constraint product_variants_product_id_fkey foreign key(product_id,store_id) references public.products(id,store_id) on delete cascade not valid;
alter table public.product_variants drop constraint product_variants_supplier_id_fkey;
alter table public.product_variants add constraint product_variants_supplier_id_fkey foreign key(supplier_id,store_id) references public.suppliers(id,store_id) on delete set null (supplier_id) not valid;
alter table public.cash_registers drop constraint cash_registers_opened_by_fkey;
alter table public.cash_registers add constraint cash_registers_opened_by_fkey foreign key(opened_by,store_id) references public.users(id,store_id) not valid;
alter table public.sales drop constraint sales_cash_register_id_fkey;
alter table public.sales add constraint sales_cash_register_id_fkey foreign key(cash_register_id,store_id) references public.cash_registers(id,store_id) not valid;
alter table public.sales drop constraint sales_sold_by_fkey;
alter table public.sales add constraint sales_sold_by_fkey foreign key(sold_by,store_id) references public.users(id,store_id) not valid;
alter table public.sales drop constraint sales_customer_id_fkey;
alter table public.sales add constraint sales_customer_id_fkey foreign key(customer_id,store_id) references public.customers(id,store_id) on delete set null (customer_id) not valid;
alter table public.sale_payments drop constraint sale_payments_sale_id_fkey;
alter table public.sale_payments add constraint sale_payments_sale_id_fkey foreign key(sale_id,store_id) references public.sales(id,store_id) on delete cascade not valid;
alter table public.cash_movements drop constraint cash_movements_cash_register_id_fkey;
alter table public.cash_movements add constraint cash_movements_cash_register_id_fkey foreign key(cash_register_id,store_id) references public.cash_registers(id,store_id) on delete cascade not valid;
alter table public.cash_movements drop constraint cash_movements_performed_by_fkey;
alter table public.cash_movements add constraint cash_movements_performed_by_fkey foreign key(performed_by,store_id) references public.users(id,store_id) not valid;
alter table public.stock_movements drop constraint stock_movements_variant_id_fkey;
alter table public.stock_movements add constraint stock_movements_variant_id_fkey foreign key(variant_id,store_id) references public.product_variants(id,store_id) on delete cascade not valid;
alter table public.stock_movements drop constraint stock_movements_performed_by_fkey;
alter table public.stock_movements add constraint stock_movements_performed_by_fkey foreign key(performed_by,store_id) references public.users(id,store_id) on delete set null (performed_by) not valid;
alter table public.purchase_orders drop constraint purchase_orders_supplier_id_fkey;
alter table public.purchase_orders add constraint purchase_orders_supplier_id_fkey foreign key(supplier_id,store_id) references public.suppliers(id,store_id) on delete restrict not valid;
alter table public.purchase_orders drop constraint purchase_orders_created_by_fkey;
alter table public.purchase_orders add constraint purchase_orders_created_by_fkey foreign key(created_by,store_id) references public.users(id,store_id) on delete set null (created_by) not valid;
create or replace function public.guard_item_tenant() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare parent_store uuid; variant_store uuid;
begin
 if TG_TABLE_NAME='sale_items' then
  select store_id into parent_store from public.sales where id=new.sale_id;
  select store_id into variant_store from public.product_variants where id=new.product_variant_id;
 else
  select store_id into parent_store from public.purchase_orders where id=new.purchase_order_id;
  select store_id into variant_store from public.product_variants where id=new.variant_id;
 end if;
 if parent_store is null or variant_store is null or parent_store<>variant_store then
  raise exception 'Referencia de ítem fuera de la tienda' using errcode='23503';
 end if;
 return new;
end $$;
create trigger stabilize_sale_item_tenant before insert or update on public.sale_items for each row execute function public.guard_item_tenant();
create trigger stabilize_order_item_tenant before insert or update on public.purchase_order_items for each row execute function public.guard_item_tenant();
-- Roles are enforced at the write boundary. RPCs owned by postgres have their own
-- explicit guard; their inventory/ledger changes must remain atomic.
create or replace function public.guard_business_write() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare tenant uuid; reg public.cash_registers; lim integer; features jsonb;
begin
 if current_user not in ('authenticated','anon') or public.is_super_admin() then
  return case when TG_OP='DELETE' then old else new end;
 end if;
 if TG_TABLE_NAME in ('products','product_variants','categories','suppliers','purchase_orders','purchase_order_items') then
  tenant:=public.require_store_role(array['owner','admin','stock_clerk'],case when TG_TABLE_NAME in ('suppliers','purchase_orders','purchase_order_items') then 'purchase_orders' else null end);
 elsif TG_TABLE_NAME='store_settings' then
  tenant:=public.require_store_role(array['owner']);
 elsif TG_TABLE_NAME='app_feedback' then
  tenant:=public.get_my_store_id();
  if tenant is null then raise exception 'Perfil activo requerido' using errcode='42501'; end if;
 elsif TG_TABLE_NAME='customers' then
  tenant:=public.require_store_role(array['owner','admin','cashier']);
 elsif TG_TABLE_NAME in ('stock_movements','sale_payments','sale_items','sales') then
  raise exception 'Usa la operación transaccional autorizada' using errcode='42501';
 else
  tenant:=public.require_store_role(array['owner','admin','cashier']);
 end if;
 if TG_OP='UPDATE' and to_jsonb(new)->>'store_id' is distinct from to_jsonb(old)->>'store_id' then
  raise exception 'No se puede cambiar la tienda' using errcode='42501';
 end if;
 if TG_TABLE_NAME='cash_registers' then
  if TG_OP='INSERT' then
   if new.opened_by<>auth.uid() or new.status<>'open' or new.closed_at is not null or new.opening_amount<0 then
    raise exception 'Apertura de caja no autorizada' using errcode='42501';
   end if;
   perform 1 from public.stores where id=tenant for update;
   features:=public.internal_store_features(tenant);
   lim:=coalesce((features->>'max_cash_registers')::integer,1);
   if not coalesce((features->>'multiple_cash_registers')::boolean,false) then lim:=1; end if;
   if exists(select 1 from cash_registers where store_id=tenant and opened_by=auth.uid() and status='open')
    or (select count(*) from cash_registers where store_id=tenant and status='open')>=lim then
    raise exception 'Límite de cajas abiertas alcanzado' using errcode='23514';
   end if;
  elsif TG_OP='UPDATE' then
   if new.opened_by<>old.opened_by or new.opened_at<>old.opened_at or new.opening_amount<>old.opening_amount
    or (old.opened_by<>auth.uid() and not public.is_store_admin_or_owner())
    or (old.status='closed' and new is distinct from old)
    or new.status<>'closed' or new.closed_at is null or new.closing_amount<0 then
    raise exception 'Cambio de caja no autorizado' using errcode='42501';
   end if;
  end if;
 elsif TG_TABLE_NAME='cash_movements' and TG_OP='INSERT' then
  select * into reg from public.cash_registers where id=new.cash_register_id and store_id=tenant for update;
  if reg.id is null or reg.status<>'open' or (reg.opened_by<>auth.uid() and not public.is_store_admin_or_owner()) or new.performed_by<>auth.uid() then
   raise exception 'Movimiento requiere caja abierta autorizada' using errcode='42501';
  end if;
 elsif TG_TABLE_NAME='purchase_orders' then
  if TG_OP='INSERT' and new.status not in ('draft','pending') then
   raise exception 'Las órdenes nuevas deben estar en borrador o pendientes' using errcode='42501';
  elsif TG_OP='UPDATE' then
   if (old.status in ('received','cancelled') and new.status is distinct from old.status) or
      (new.status='received' and new.status is distinct from old.status) then
    raise exception 'Estado final de orden protegido; usa receive_purchase_order' using errcode='42501';
   end if;
  end if;
 elsif TG_TABLE_NAME='product_variants' then
  if TG_OP<>'DELETE' and new.track_batch and not coalesce((public.internal_store_features(tenant)->>'batch_expiry_control')::boolean,false) then
   raise exception 'El plan no habilita control de lotes' using errcode='42501';
  end if;
 elsif TG_TABLE_NAME='app_feedback' then
  if TG_OP<>'INSERT' or new.store_id is distinct from tenant or new.user_id is distinct from auth.uid()
   or new.status<>'pending' or new.admin_notes is not null then
   raise exception 'Comentario no autorizado' using errcode='42501';
  end if;
  new.user_role:=public.get_my_role();

 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
do $$declare tab text; begin
 foreach tab in array array['products','product_variants','categories','suppliers','purchase_orders','purchase_order_items','store_settings','customers','stock_movements','sale_payments','sale_items','sales','cash_registers','cash_movements','app_feedback'] loop
  execute format('create trigger stabilize_business_write before insert or update or delete on public.%I for each row execute function public.guard_business_write()',tab);
 end loop;
end $$;
-- Avoid leaking customer PII through a privileged duplicate lookup.
create or replace function public.check_duplicate_customer(p_store_id uuid,p_phone text default null,p_email text default null,p_exclude_customer_id uuid default null)
returns table(id uuid,full_name text,phone text,email text,matched_by text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if p_store_id is distinct from public.require_store_role(array['owner','admin','cashier']) then
  raise exception 'No autorizado para consultar otra tienda' using errcode='42501';
 end if;
 return query select c.id,c.full_name,c.phone,c.email,
  case when c.phone=nullif(trim(p_phone),'') and lower(c.email)=nullif(lower(trim(p_email)),'') then 'phone_and_email'
   when c.phone=nullif(trim(p_phone),'') then 'phone' else 'email' end
 from public.customers c where c.store_id=p_store_id
  and (p_exclude_customer_id is null or c.id<>p_exclude_customer_id)
  and (c.phone=nullif(trim(p_phone),'') or lower(c.email)=nullif(lower(trim(p_email)),'')) limit 1;
end $$;
revoke all on function public.check_duplicate_customer(uuid,text,text,uuid) from public,anon;
grant execute on function public.check_duplicate_customer(uuid,text,text,uuid) to authenticated;
-- Preserve the admin response contract and add the missing authorization check.
alter function public.get_admin_stores_overview() rename to internal_admin_stores_overview;
revoke all on function public.internal_admin_stores_overview() from public,anon,authenticated;
create function public.get_admin_stores_overview() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
 if not public.is_super_admin() then raise exception 'No autorizado' using errcode='42501'; end if;
 return public.internal_admin_stores_overview();
end $$;
revoke all on function public.get_admin_stores_overview() from public,anon;
grant execute on function public.get_admin_stores_overview() to authenticated;
-- One persisted key per tenant; text preserves existing offline-* identifiers.
alter table public.sales add column idempotency_key text;
create unique index sales_store_idempotency_key on public.sales(store_id,idempotency_key) where idempotency_key is not null;
drop function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text);
create function public.create_sale(
 p_cash_register_id uuid,p_payment_method text,p_items jsonb,p_customer_id uuid default null,
 p_discount numeric default 0,p_payments jsonb default null,p_customer_email text default null,
 p_idempotency_key text default null,p_created_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
 tenant uuid:=public.require_store_role(array['owner','admin','cashier']);
 sale_id uuid; prior public.sales; reg public.cash_registers; settings public.store_settings;
 item jsonb; variant record; qty numeric; price numeric; line_discount numeric; line_total numeric;
 subtotal numeric:=0; final_total numeric; payment jsonb; payment_sum numeric:=0;
 key text:=nullif(trim(p_idempotency_key),''); sale_at timestamptz:=coalesce(p_created_at,now());
begin
 if key is not null then
  if length(key)>200 then raise exception 'Clave de idempotencia demasiado larga'; end if;
  -- Serialize same key before looking it up, including concurrent first insertion.
  perform pg_advisory_xact_lock(hashtextextended(tenant::text||':'||key,0));
  select * into prior from public.sales where store_id=tenant and idempotency_key=key;
  if found then
   if prior.sold_by<>auth.uid() or prior.cash_register_id<>p_cash_register_id then
    raise exception 'La clave ya está asociada a otro cajero o caja' using errcode='42501';
   end if;
   return prior.id;
  end if;
 end if;
 select * into reg from public.cash_registers where id=p_cash_register_id and store_id=tenant for update;
 if reg.id is null or reg.opened_by<>auth.uid() then
  raise exception 'La caja no pertenece al cajero activo' using errcode='42501';
 end if;
 if sale_at>now()+interval '5 minutes' or sale_at<reg.opened_at then raise exception 'Fecha de venta fuera del turno'; end if;
 if reg.status<>'open' and not (key is not null and p_created_at is not null and reg.closed_at is not null and sale_at<=reg.closed_at) then
  raise exception 'La caja está cerrada';
 end if;
 select * into settings from public.store_settings where store_id=tenant;
 if p_customer_id is null and coalesce(settings.require_customer_for_sale,false) then raise exception 'Cliente requerido'; end if;
 if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id and store_id=tenant and is_active) then
  raise exception 'Cliente no encontrado o inactivo en tu tienda' using errcode='23503';
 end if;
 if p_payment_method is null or p_payment_method not in ('cash','card','qr','transfer','split') then raise exception 'Método de pago inválido'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'La venta requiere ítems'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount<>round(p_discount,2) then raise exception 'Descuento global inválido'; end if;
 -- Lock all variants in deterministic order. Repeated lines are then checked
 -- against the cumulative quantity rather than independently against old stock.
 perform pv.id from public.product_variants pv
 where pv.id in (select (j->>'product_variant_id')::uuid from jsonb_array_elements(p_items) j)
  and pv.store_id=tenant order by pv.id for update;
 for item in select * from jsonb_array_elements(p_items) loop
  select pv.*,p.is_active as product_active into variant from public.product_variants pv
   join public.products p on p.id=pv.product_id and p.store_id=pv.store_id
   where pv.id=(item->>'product_variant_id')::uuid and pv.store_id=tenant;
  if not found or not variant.is_active or not variant.product_active then raise exception 'Producto no encontrado o inactivo en tu tienda'; end if;
  qty:=(item->>'quantity')::numeric;
  price:=coalesce((item->>'unit_price')::numeric,variant.sale_price);
  line_discount:=coalesce((item->>'discount')::numeric,0);
  if qty is null or qty::text in ('NaN','Infinity','-Infinity') or qty<=0 or qty<>round(qty,3)
    or price::text in ('NaN','Infinity','-Infinity') or price<0 or price<>round(price,2)
    or line_discount::text in ('NaN','Infinity','-Infinity') or line_discount<0 or line_discount<>round(line_discount,2)
    or line_discount>round(qty*price,2) then raise exception 'Cantidad, precio o descuento inválido'; end if;
  if variant.unit='unit' and qty<>trunc(qty) then raise exception 'Las unidades requieren cantidad entera'; end if;
  if not coalesce(settings.allow_negative_stock,false) and variant.stock_quantity <
    (select sum((j->>'quantity')::numeric) from jsonb_array_elements(p_items) j where j->>'product_variant_id'=item->>'product_variant_id') then
   raise exception 'Stock insuficiente para %',variant.name;
  end if;
  subtotal:=subtotal+round(qty*price,2)-line_discount;
 end loop;
 if p_discount>subtotal then raise exception 'Descuento global supera subtotal'; end if;
 final_total:=subtotal-p_discount;
 if p_payments is not null and jsonb_typeof(p_payments)<>'array' then raise exception 'Pagos inválidos'; end if;
 if p_payment_method='split' or coalesce(jsonb_array_length(p_payments),0)>1 then
  perform public.require_store_role(array['owner','admin','cashier'],'split_payments');
 end if;
 if p_payments is null or jsonb_array_length(p_payments)=0 then
  if p_payment_method='split' then raise exception 'Pago dividido requiere detalle'; end if;
  p_payments:=case when final_total>0 then jsonb_build_array(jsonb_build_object('payment_method',p_payment_method,'amount',final_total)) else '[]'::jsonb end;
 end if;
 for payment in select * from jsonb_array_elements(p_payments) loop
  if payment->>'payment_method' is null or payment->>'payment_method' not in ('cash','card','qr','transfer')
   or payment->>'amount' is null or (payment->>'amount')::numeric::text in ('NaN','Infinity','-Infinity')
   or (payment->>'amount')::numeric<=0 or (payment->>'amount')::numeric<>round((payment->>'amount')::numeric,2) then raise exception 'Detalle de pago inválido'; end if;
  if p_payment_method<>'split' and payment->>'payment_method'<>p_payment_method then raise exception 'Método de pago no coincide con detalle'; end if;
  payment_sum:=payment_sum+(payment->>'amount')::numeric;
 end loop;
 if payment_sum<>final_total then raise exception 'Suma de pagos no coincide con total'; end if;
 insert into public.sales(store_id,cash_register_id,sold_by,customer_id,payment_method,subtotal,discount,total,status,customer_email,idempotency_key,created_at)
 values(tenant,p_cash_register_id,auth.uid(),p_customer_id,p_payment_method,subtotal,p_discount,final_total,'completed',p_customer_email,key,sale_at) returning id into sale_id;
 for item in select * from jsonb_array_elements(p_items) loop
  select * into variant from public.product_variants where id=(item->>'product_variant_id')::uuid and store_id=tenant;
  qty:=(item->>'quantity')::numeric; price:=coalesce((item->>'unit_price')::numeric,variant.sale_price); line_discount:=coalesce((item->>'discount')::numeric,0);
  line_total:=round(qty*price,2)-line_discount;
  insert into public.sale_items(sale_id,product_variant_id,quantity,unit_price,discount,subtotal,cost_price)
   values(sale_id,variant.id,qty,price,line_discount,line_total,variant.cost_price);
  update public.product_variants set stock_quantity=stock_quantity-qty where id=variant.id;
  insert into public.stock_movements(store_id,variant_id,type,quantity_change,previous_stock,new_stock,reason,performed_by,created_at)
   values(tenant,variant.id,'sale',-qty,variant.stock_quantity,variant.stock_quantity-qty,'Venta POS #'||sale_id,auth.uid(),sale_at);
 end loop;
 for payment in select * from jsonb_array_elements(p_payments) loop
  insert into public.sale_payments(sale_id,store_id,payment_method,amount,created_at)
   values(sale_id,tenant,payment->>'payment_method',(payment->>'amount')::numeric,sale_at);
 end loop;
 return sale_id;
end $$;
revoke all on function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz) from public,anon;
grant execute on function public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz) to authenticated;
-- Remove the historical two-argument overload (it bypassed the newer contract).
drop function if exists public.refund_sale(uuid,text);
create or replace function public.refund_sale(p_sale_id uuid,p_reason text default null,p_disburse_cash_register_id uuid default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare tenant uuid:=public.require_store_role(array['owner','admin']); sale public.sales;
 item record; variant public.product_variants; cash_paid numeric; target public.cash_registers;
begin
 select * into sale from public.sales where id=p_sale_id and store_id=tenant for update;
 if not found then raise exception 'Venta no encontrada en tu tienda'; end if;
 if sale.status<>'completed' then raise exception 'La venta ya fue anulada o reembolsada previamente'; end if;
 select coalesce(sum(amount) filter(where payment_method='cash'),0) into cash_paid from public.sale_payments where sale_id=p_sale_id;
 if cash_paid=0 and sale.payment_method='cash' and not exists(select 1 from public.sale_payments where sale_id=p_sale_id) then cash_paid:=sale.total; end if;
 if cash_paid>0 then
  if p_disburse_cash_register_id is not null then
   select * into target from public.cash_registers where id=p_disburse_cash_register_id and store_id=tenant for update;
  else
   select * into target from public.cash_registers where store_id=tenant and status='open'
    order by (id=sale.cash_register_id) desc,(opened_by=auth.uid()) desc,opened_at desc limit 1 for update;
  end if;
  if target.id is null or target.status<>'open' then raise exception 'Reembolso de efectivo requiere caja abierta'; end if;
 end if;
 perform pv.id from public.product_variants pv join public.sale_items si on si.product_variant_id=pv.id
  where si.sale_id=p_sale_id order by pv.id for update of pv;
 for item in select * from public.sale_items where sale_id=p_sale_id order by product_variant_id loop
  select * into variant from public.product_variants where id=item.product_variant_id and store_id=tenant;
  if not found then raise exception 'Producto de devolución fuera de tienda'; end if;
  update public.product_variants set stock_quantity=stock_quantity+item.quantity where id=variant.id;
  insert into public.stock_movements(store_id,variant_id,type,quantity_change,previous_stock,new_stock,reason,performed_by)
   values(tenant,variant.id,'manual_adjustment',item.quantity,variant.stock_quantity,variant.stock_quantity+item.quantity,'Devolución de Venta #'||p_sale_id,auth.uid());
 end loop;
 if cash_paid>0 then
  insert into public.cash_movements(store_id,cash_register_id,performed_by,type,amount,reason)
   values(tenant,target.id,auth.uid(),'out',cash_paid,'Devolución de efectivo por Venta #'||p_sale_id||coalesce(' — '||p_reason,''));
 end if;
 update public.sales set status='refunded',refund_reason=coalesce(p_reason,'Devolución de venta'),refunded_at=now(),refunded_by=auth.uid() where id=p_sale_id;
 return true;
end $$;
revoke all on function public.refund_sale(uuid,text,uuid) from public,anon;
grant execute on function public.refund_sale(uuid,text,uuid) to authenticated;
create or replace function public.receive_purchase_order(p_order_id uuid) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare tenant uuid:=public.require_store_role(array['owner','admin','stock_clerk'],'purchase_orders');
 po public.purchase_orders; item record; variant public.product_variants;
begin
 select * into po from public.purchase_orders where id=p_order_id and store_id=tenant for update;
 if not found then raise exception 'Orden de compra no encontrada'; end if;
 if po.status not in ('draft','pending') then raise exception 'La orden ya fue recibida o cancelada'; end if;
 perform 1 from public.purchase_order_items where purchase_order_id=p_order_id order by variant_id for update;
 if not found then raise exception 'La orden no contiene ítems'; end if;
 perform pv.id from public.product_variants pv join public.purchase_order_items poi on poi.variant_id=pv.id
  where poi.purchase_order_id=p_order_id order by pv.id for update of pv;
 for item in select * from public.purchase_order_items where purchase_order_id=p_order_id order by variant_id loop
  select * into variant from public.product_variants where id=item.variant_id and store_id=tenant;
  if not found then raise exception 'Variante fuera de tienda'; end if;
  update public.product_variants set stock_quantity=stock_quantity+item.quantity,cost_price=item.cost_price where id=variant.id;
  insert into public.stock_movements(store_id,variant_id,type,quantity_change,previous_stock,new_stock,reason,performed_by)
   values(tenant,variant.id,'purchase_order',item.quantity,variant.stock_quantity,variant.stock_quantity+item.quantity,'Recepción OC #'||po.order_number,auth.uid());
 end loop;
 update public.purchase_orders set status='received',received_at=now() where id=p_order_id;
 return true;
end $$;
revoke all on function public.receive_purchase_order(uuid) from public,anon;
grant execute on function public.receive_purchase_order(uuid) to authenticated;
create or replace function public.adjust_variant_stock(p_variant_id uuid,p_new_stock numeric,p_type text,p_reason text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tenant uuid:=public.require_store_role(array['owner','admin','stock_clerk']); variant public.product_variants; movement uuid;
begin
 if p_type not in ('manual_adjustment','waste','supplier_return','physical_count') or p_type is null
  or p_new_stock is null or p_new_stock::text in ('NaN','Infinity','-Infinity') or p_new_stock<0 or p_new_stock<>round(p_new_stock,3) then raise exception 'Ajuste de existencias inválido'; end if;
 if p_type='physical_count' then perform public.require_store_role(array['owner','admin','stock_clerk'],'physical_count'); end if;
 select * into variant from public.product_variants where id=p_variant_id and store_id=tenant for update;
 if not found then raise exception 'Variante no encontrada en tu tienda'; end if;
 update public.product_variants set stock_quantity=p_new_stock where id=p_variant_id;
 insert into public.stock_movements(store_id,variant_id,type,quantity_change,previous_stock,new_stock,reason,performed_by)
  values(tenant,p_variant_id,p_type,p_new_stock-variant.stock_quantity,variant.stock_quantity,p_new_stock,p_reason,auth.uid()) returning id into movement;
 return movement;
end $$;
revoke all on function public.adjust_variant_stock(uuid,numeric,text,text) from public,anon;
grant execute on function public.adjust_variant_stock(uuid,numeric,text,text) to authenticated;
create or replace function public.get_store_analytics(p_start_date timestamptz,p_end_date timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare tenant uuid:=public.require_store_role(array['owner','admin'],'advanced_analytics'); zone text; result jsonb;
begin
 if p_start_date is null or p_end_date is null or p_start_date>p_end_date then raise exception 'Intervalo de fechas inválido'; end if;
 select timezone into zone from public.store_settings where store_id=tenant;
 if zone is null or not exists(select 1 from pg_timezone_names where name=zone) then zone:='America/La_Paz'; end if;
 with eligible as (
  select s.*,coalesce((select sum(si.quantity*si.cost_price) from public.sale_items si where si.sale_id=s.id),0) as cost
  from public.sales s where s.store_id=tenant and s.status='completed' and s.created_at>=p_start_date and s.created_at<=p_end_date
 ), payment_rows as (
  select sp.sale_id,sp.payment_method,sp.amount from public.sale_payments sp join eligible e on e.id=sp.sale_id and e.store_id=sp.store_id
  union all
  select e.id,e.payment_method,e.total from eligible e where e.payment_method<>'split' and not exists(select 1 from public.sale_payments sp where sp.sale_id=e.id)
 ), summary as (
  select jsonb_build_object(
   'total_sales',coalesce(sum(e.total),0),'total_orders',count(*),'total_cost',coalesce(sum(e.cost),0),
   'gross_profit',coalesce(sum(e.total-e.cost),0),
   'profit_margin',case when sum(e.total)>0 then round(sum(e.total-e.cost)/sum(e.total)*100,2) else 0 end,
   'average_ticket',coalesce(round(avg(e.total),2),0),
   'cash_sales',coalesce((select sum(amount) from payment_rows where payment_method='cash'),0),
   'card_sales',coalesce((select sum(amount) from payment_rows where payment_method='card'),0)
  ) as data from eligible e
 ), daily as (
  select to_char(e.created_at at time zone zone,'YYYY-MM-DD') as day,
   jsonb_build_object('date',to_char(e.created_at at time zone zone,'YYYY-MM-DD'),
    'total_sales',sum(e.total),'total_cost',sum(e.cost),'gross_profit',sum(e.total-e.cost),'orders_count',count(*)) as data
  from eligible e group by to_char(e.created_at at time zone zone,'YYYY-MM-DD')
 ), product_totals as (
  select p.id,p.name,pv.name as variant_name,c.name as category_name,sum(si.quantity) as quantity,
   sum(case when e.subtotal>0 then si.subtotal*e.total/e.subtotal else si.subtotal end) as revenue,
   sum(si.quantity*si.cost_price) as cost
  from eligible e join public.sale_items si on si.sale_id=e.id
  join public.product_variants pv on pv.id=si.product_variant_id join public.products p on p.id=pv.product_id
  left join public.categories c on c.id=p.category_id group by p.id,p.name,pv.name,c.name
  order by revenue desc limit 50
 ), top_products as (
  select jsonb_build_object('product_id',id,'product_name',name,'variant_name',variant_name,'category_name',category_name,
   'quantity_sold',quantity,'revenue',round(revenue,2),'cost',cost,'gross_profit',round(revenue-cost,2),
   'profit_margin',case when revenue>0 then round((revenue-cost)/revenue*100,2) else 0 end) as data,revenue
  from product_totals
 ), methods as (
  select jsonb_build_object('method',payment_method,'total',sum(amount),'count',count(distinct sale_id)) as data,sum(amount) as amount
  from payment_rows group by payment_method
 )
 select jsonb_build_object('summary',(select data from summary),
  'daily_sales',coalesce((select jsonb_agg(data order by day) from daily),'[]'::jsonb),
  'top_products',coalesce((select jsonb_agg(data order by revenue desc) from top_products),'[]'::jsonb),
  'payment_methods',coalesce((select jsonb_agg(data order by amount desc) from methods),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.get_store_analytics(timestamptz,timestamptz) from public,anon;
grant execute on function public.get_store_analytics(timestamptz,timestamptz) to authenticated;

-- Cash reconciliation includes original tender and the corresponding refund outflow.
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
  where id = p_register_id for update;

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
    and s.status in ('completed','refunded');

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


-- Product, first variant, and its opening stock ledger are one server transaction.
create or replace function public.create_product_with_variant(p_product jsonb,p_variant jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
 tenant uuid:=public.require_store_role(array['owner','admin','stock_clerk']);
 product public.products; variant public.product_variants;
 qty numeric; cost numeric; price numeric; threshold numeric; unit_name text; batch boolean;
begin
 if p_product is null or jsonb_typeof(p_product)<>'object' or p_variant is null or jsonb_typeof(p_variant)<>'object'
  or nullif(trim(p_product->>'name'),'') is null then raise exception 'Producto y variante requieren datos válidos'; end if;
 qty:=coalesce((p_variant->>'stock_quantity')::numeric,0);
 cost:=coalesce((p_variant->>'cost_price')::numeric,0);
 price:=coalesce((p_variant->>'sale_price')::numeric,0);
 threshold:=coalesce((p_variant->>'low_stock_threshold')::numeric,5);
 unit_name:=coalesce(nullif(p_variant->>'unit',''),'unit');
 batch:=coalesce((p_variant->>'track_batch')::boolean,false);
 if qty::text in ('NaN','Infinity','-Infinity') or qty<0 or qty<>round(qty,3)
  or cost::text in ('NaN','Infinity','-Infinity') or cost<0 or cost<>round(cost,2)
  or price::text in ('NaN','Infinity','-Infinity') or price<0 or price<>round(price,2)
  or threshold::text in ('NaN','Infinity','-Infinity') or threshold<0 or threshold<>round(threshold,3)
  or unit_name not in ('unit','kg','g','l','ml','m') or (unit_name='unit' and qty<>trunc(qty)) then
  raise exception 'Precios, existencias, umbral o unidad inválidos';
 end if;
 if batch then perform public.require_store_role(array['owner','admin','stock_clerk'],'batch_expiry_control'); end if;
 -- Explicit columns form the whitelist. Client store_id/product_id/role fields
 -- never participate in authorization or row ownership.
 insert into public.products(store_id,name,description,category_id,image_url)
 values(tenant,trim(p_product->>'name'),p_product->>'description',nullif(p_product->>'category_id','')::uuid,p_product->>'image_url')
 returning * into product;
 insert into public.product_variants(store_id,product_id,name,barcode,sku,cost_price,sale_price,stock_quantity,
  low_stock_threshold,unit,image_url,supplier_id,track_batch,batch_number,expiry_date)
 values(tenant,product.id,coalesce(nullif(trim(p_variant->>'name'),''),'Único'),nullif(trim(p_variant->>'barcode'),''),
  nullif(trim(p_variant->>'sku'),''),cost,price,qty,threshold,unit_name,p_variant->>'image_url',
  nullif(p_variant->>'supplier_id','')::uuid,batch,p_variant->>'batch_number',nullif(p_variant->>'expiry_date','')::date)
 returning * into variant;
 if qty>0 then
  insert into public.stock_movements(store_id,variant_id,type,quantity_change,previous_stock,new_stock,reason,performed_by)
  values(tenant,variant.id,'manual_adjustment',qty,0,qty,'Inventario inicial al crear producto',auth.uid());
 end if;
 return jsonb_build_object('product',to_jsonb(product),'variant',to_jsonb(variant));
end $$;
revoke all on function public.create_product_with_variant(jsonb,jsonb) from public,anon;
grant execute on function public.create_product_with_variant(jsonb,jsonb) to authenticated;

commit;
