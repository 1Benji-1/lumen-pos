begin;

-- A separate trigger preserves the stabilized business guard unchanged.
-- SECURITY DEFINER transactional RPCs enforce their own module at entry.
create function public.guard_module_business_write() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare tenant uuid; row_tenant uuid; module_id text; permission_code text;
begin
 if current_user not in ('authenticated','anon') or public.is_super_admin() then
   return case when TG_OP='DELETE' then old else new end;
 end if;
 if TG_TABLE_NAME in ('products','product_variants','categories','suppliers','purchase_orders','purchase_order_items') then
   module_id:='inventory'; permission_code:='inventory:manage';
 elsif TG_TABLE_NAME='customers' then
   module_id:='customers'; permission_code:='customers:manage';
 elsif TG_TABLE_NAME='store_settings' then
   module_id:='settings'; permission_code:='settings:manage';
 elsif TG_TABLE_NAME='cash_movements' then
   module_id:='pos'; permission_code:='pos:manage_cash';
 else
   raise exception 'Tabla sin autorización modular' using errcode='42501';
 end if;
 tenant:=public.require_active_module(module_id,permission_code);
 if TG_TABLE_NAME='purchase_order_items' then
   if TG_OP='DELETE' then
     select store_id into row_tenant from public.purchase_orders where id=old.purchase_order_id;
   else
     select store_id into row_tenant from public.purchase_orders where id=new.purchase_order_id;
   end if;
 elsif TG_OP='DELETE' then
   row_tenant:=old.store_id;
 else
   row_tenant:=new.store_id;
 end if;
 if row_tenant is distinct from tenant then
   raise exception 'Operación fuera de tu tienda' using errcode='42501';
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
do $$declare tab text; begin
 foreach tab in array array['products','product_variants','categories','suppliers','purchase_orders',
  'purchase_order_items','customers','store_settings','cash_movements'] loop
   execute format('create trigger module_business_write before insert or update or delete on public.%I for each row execute function public.guard_module_business_write()',tab);
 end loop;
end $$;

create function public.guard_module_profile_write() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare tenant uuid;
begin
 if current_user not in ('authenticated','anon') or public.is_super_admin() then
   return case when TG_OP='DELETE' then old else new end;
 end if;
 if TG_OP='INSERT' and public.get_my_store_id() is null
   and new.id=auth.uid() and new.role='owner' and new.is_active
   and exists(select 1 from public.stores where id=new.store_id and owner_id=auth.uid()) then
   return new;
 end if;
 tenant:=public.require_active_module('staff','staff:manage');
 if (case when TG_OP='DELETE' then old.store_id else new.store_id end) is distinct from tenant then
   raise exception 'Perfil fuera de tu tienda' using errcode='42501';
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
-- Run after stabilize_profile_write, which may take the stronger store lock
-- for user limits. This avoids a SHARE-to-UPDATE lock upgrade race.
create trigger z_module_profile_write before insert or update or delete on public.users
for each row execute function public.guard_module_profile_write();

create function public.guard_module_store_write() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user not in ('authenticated','anon') or public.is_super_admin() or TG_OP='INSERT' then return new; end if;
 if new.name is distinct from old.name or new.business_type is distinct from old.business_type
   or new.industry_sub_type is distinct from old.industry_sub_type then
   if old.id is distinct from public.require_active_module('settings','settings:manage') then
     raise exception 'Tienda fuera de tu alcance' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
create trigger module_store_write before insert or update on public.stores
for each row execute function public.guard_module_store_write();

-- Cash register closeout is the one customer write allowed after module or
-- subscription pause. Keep the prior field and register-limit restrictions.
create function public.guard_cash_register_module_write() returns trigger
language plpgsql set search_path=public,pg_temp as $$
declare tenant uuid; lim integer; features jsonb;
begin
 if current_user not in ('authenticated','anon') or public.is_super_admin() then
   return case when TG_OP='DELETE' then old else new end;
 end if;
 if TG_OP='INSERT' then
   tenant:=public.get_my_store_id();
   if tenant is null then raise exception 'Perfil activo requerido' using errcode='42501'; end if;
   perform 1 from public.stores where id=tenant for update;
   tenant:=public.require_active_module('pos','pos:manage_cash');
   perform public.require_store_role(array['owner','admin','cashier']);
   if new.store_id is distinct from tenant or new.opened_by is distinct from auth.uid()
      or new.status<>'open' or new.closed_at is not null or new.opening_amount<0 then
     raise exception 'Apertura de caja no autorizada' using errcode='42501';
   end if;
   features:=public.internal_store_features(tenant);
   lim:=coalesce((features->>'max_cash_registers')::integer,1);
   if not coalesce((features->>'multiple_cash_registers')::boolean,false) then lim:=1; end if;
   if exists(select 1 from public.cash_registers where store_id=tenant and opened_by=auth.uid() and status='open')
      or (select count(*) from public.cash_registers where store_id=tenant and status='open')>=lim then
     raise exception 'Límite de cajas abiertas alcanzado' using errcode='23514';
   end if;
 elsif TG_OP='UPDATE' then
   tenant:=public.require_closeout_permission();
   if old.store_id is distinct from tenant or new.store_id is distinct from old.store_id
      or new.id is distinct from old.id or new.opened_by is distinct from old.opened_by
      or new.opened_at is distinct from old.opened_at or new.opening_amount is distinct from old.opening_amount
      or (old.opened_by<>auth.uid() and not public.is_store_admin_or_owner())
      or old.status<>'open' or new.status<>'closed' or new.closed_at is null
      or new.closing_amount is null or new.closing_amount<0 then
     raise exception 'Cambio de caja no autorizado' using errcode='42501';
   end if;
 else
   raise exception 'No se puede eliminar caja' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger stabilize_business_write on public.cash_registers;
create trigger module_cash_register_write before insert or update or delete on public.cash_registers
for each row execute function public.guard_cash_register_module_write();

revoke all on function public.guard_module_business_write(),public.guard_module_profile_write(),
 public.guard_module_store_write(),public.guard_cash_register_module_write() from public,anon,authenticated;

commit;
