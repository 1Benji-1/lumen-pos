begin;

-- These rows mirror the TypeScript defaults and fixed role matrix. A parity
-- test rejects drift; runtime SQL does not trust client-computed access.
create table public.category_module_defaults (
  category_id text not null,
  module_id text not null references public.module_catalog(id),
  primary key (category_id,module_id)
);
create table public.role_permissions (
  role text not null,
  permission text not null,
  primary key (role,permission)
);
insert into public.category_module_defaults(category_id,module_id) values
 ('comercio_general','dashboard'),
 ('comercio_general','pos'),
 ('comercio_general','inventory'),
 ('comercio_general','customers'),
 ('comercio_general','analytics'),
 ('comercio_general','staff'),
 ('comercio_general','settings'),
 ('minimarket_abarrotes','dashboard'),
 ('minimarket_abarrotes','pos'),
 ('minimarket_abarrotes','inventory'),
 ('minimarket_abarrotes','customers'),
 ('minimarket_abarrotes','analytics'),
 ('minimarket_abarrotes','staff'),
 ('minimarket_abarrotes','settings'),
 ('minimarket_abarrotes','scales'),
 ('ropa_calzado','dashboard'),
 ('ropa_calzado','pos'),
 ('ropa_calzado','inventory'),
 ('ropa_calzado','customers'),
 ('ropa_calzado','analytics'),
 ('ropa_calzado','staff'),
 ('ropa_calzado','settings'),
 ('ferreteria_construccion','dashboard'),
 ('ferreteria_construccion','pos'),
 ('ferreteria_construccion','inventory'),
 ('ferreteria_construccion','customers'),
 ('ferreteria_construccion','analytics'),
 ('ferreteria_construccion','staff'),
 ('ferreteria_construccion','settings'),
 ('ferreteria_construccion','quotes'),
 ('farmacia_belleza','dashboard'),
 ('farmacia_belleza','pos'),
 ('farmacia_belleza','inventory'),
 ('farmacia_belleza','customers'),
 ('farmacia_belleza','analytics'),
 ('farmacia_belleza','staff'),
 ('farmacia_belleza','settings'),
 ('libreria_papeleria','dashboard'),
 ('libreria_papeleria','pos'),
 ('libreria_papeleria','inventory'),
 ('libreria_papeleria','customers'),
 ('libreria_papeleria','analytics'),
 ('libreria_papeleria','staff'),
 ('libreria_papeleria','settings'),
 ('tecnologia_celulares','dashboard'),
 ('tecnologia_celulares','pos'),
 ('tecnologia_celulares','inventory'),
 ('tecnologia_celulares','customers'),
 ('tecnologia_celulares','analytics'),
 ('tecnologia_celulares','staff'),
 ('tecnologia_celulares','settings'),
 ('tecnologia_celulares','work_orders'),
 ('repuestos','dashboard'),
 ('repuestos','pos'),
 ('repuestos','inventory'),
 ('repuestos','customers'),
 ('repuestos','analytics'),
 ('repuestos','staff'),
 ('repuestos','settings'),
 ('repuestos','quotes'),
 ('repuestos','work_orders'),
 ('tienda_mascotas','dashboard'),
 ('tienda_mascotas','pos'),
 ('tienda_mascotas','inventory'),
 ('tienda_mascotas','customers'),
 ('tienda_mascotas','analytics'),
 ('tienda_mascotas','staff'),
 ('tienda_mascotas','settings'),
 ('tienda_mascotas','agenda'),
 ('restaurante_tradicional','dashboard'),
 ('restaurante_tradicional','pos'),
 ('restaurante_tradicional','orders'),
 ('restaurante_tradicional','kitchen'),
 ('restaurante_tradicional','inventory'),
 ('restaurante_tradicional','recipes'),
 ('restaurante_tradicional','customers'),
 ('restaurante_tradicional','analytics'),
 ('restaurante_tradicional','staff'),
 ('restaurante_tradicional','settings'),
 ('restaurante_tradicional','tables'),
 ('cafeteria','dashboard'),
 ('cafeteria','pos'),
 ('cafeteria','orders'),
 ('cafeteria','kitchen'),
 ('cafeteria','inventory'),
 ('cafeteria','recipes'),
 ('cafeteria','customers'),
 ('cafeteria','analytics'),
 ('cafeteria','staff'),
 ('cafeteria','settings'),
 ('cafeteria','tables'),
 ('bar','dashboard'),
 ('bar','pos'),
 ('bar','orders'),
 ('bar','kitchen'),
 ('bar','inventory'),
 ('bar','recipes'),
 ('bar','customers'),
 ('bar','analytics'),
 ('bar','staff'),
 ('bar','settings'),
 ('bar','tables'),
 ('panaderia','dashboard'),
 ('panaderia','pos'),
 ('panaderia','orders'),
 ('panaderia','inventory'),
 ('panaderia','recipes'),
 ('panaderia','customers'),
 ('panaderia','analytics'),
 ('panaderia','staff'),
 ('panaderia','settings'),
 ('comida_rapida','dashboard'),
 ('comida_rapida','pos'),
 ('comida_rapida','orders'),
 ('comida_rapida','kitchen'),
 ('comida_rapida','inventory'),
 ('comida_rapida','recipes'),
 ('comida_rapida','customers'),
 ('comida_rapida','analytics'),
 ('comida_rapida','staff'),
 ('comida_rapida','settings'),
 ('dark_kitchen','dashboard'),
 ('dark_kitchen','orders'),
 ('dark_kitchen','kitchen'),
 ('dark_kitchen','inventory'),
 ('dark_kitchen','recipes'),
 ('dark_kitchen','customers'),
 ('dark_kitchen','analytics'),
 ('dark_kitchen','staff'),
 ('dark_kitchen','settings'),
 ('barberia_belleza','dashboard'),
 ('barberia_belleza','customers'),
 ('barberia_belleza','staff'),
 ('barberia_belleza','analytics'),
 ('barberia_belleza','settings'),
 ('barberia_belleza','agenda'),
 ('barberia_belleza','pos'),
 ('barberia_belleza','cash'),
 ('lavanderia','dashboard'),
 ('lavanderia','customers'),
 ('lavanderia','staff'),
 ('lavanderia','analytics'),
 ('lavanderia','settings'),
 ('lavanderia','orders'),
 ('lavanderia','cash'),
 ('taller','dashboard'),
 ('taller','customers'),
 ('taller','staff'),
 ('taller','analytics'),
 ('taller','settings'),
 ('taller','work_orders'),
 ('taller','inventory'),
 ('taller','purchases'),
 ('taller','quotes'),
 ('servicio_tecnico','dashboard'),
 ('servicio_tecnico','customers'),
 ('servicio_tecnico','staff'),
 ('servicio_tecnico','analytics'),
 ('servicio_tecnico','settings'),
 ('servicio_tecnico','work_orders'),
 ('servicio_tecnico','inventory'),
 ('mayorista_general','dashboard'),
 ('mayorista_general','inventory'),
 ('mayorista_general','purchases'),
 ('mayorista_general','orders'),
 ('mayorista_general','quotes'),
 ('mayorista_general','customers'),
 ('mayorista_general','credit'),
 ('mayorista_general','analytics'),
 ('mayorista_general','staff'),
 ('mayorista_general','settings'),
 ('distribuidor','dashboard'),
 ('distribuidor','inventory'),
 ('distribuidor','purchases'),
 ('distribuidor','orders'),
 ('distribuidor','quotes'),
 ('distribuidor','customers'),
 ('distribuidor','credit'),
 ('distribuidor','analytics'),
 ('distribuidor','staff'),
 ('distribuidor','settings'),
 ('distribuidor','delivery');
insert into public.role_permissions(role,permission) values
 ('owner','dashboard:view'),
 ('owner','pos:access'),
 ('owner','pos:manage_cash'),
 ('owner','pos:audit_cash'),
 ('owner','inventory:view'),
 ('owner','inventory:manage'),
 ('owner','customers:view'),
 ('owner','customers:manage'),
 ('owner','analytics:view'),
 ('owner','staff:view'),
 ('owner','staff:manage'),
 ('owner','settings:manage'),
 ('admin','dashboard:view'),
 ('admin','pos:access'),
 ('admin','pos:manage_cash'),
 ('admin','pos:audit_cash'),
 ('admin','inventory:view'),
 ('admin','inventory:manage'),
 ('admin','customers:view'),
 ('admin','customers:manage'),
 ('admin','analytics:view'),
 ('admin','staff:view'),
 ('admin','staff:manage'),
 ('cashier','pos:access'),
 ('cashier','pos:manage_cash'),
 ('cashier','inventory:view'),
 ('cashier','customers:view'),
 ('cashier','customers:manage'),
 ('stock_clerk','inventory:view'),
 ('stock_clerk','inventory:manage');

revoke all on public.category_module_defaults,public.role_permissions from public,anon,authenticated;

create function public.has_store_permission(p_permission text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
   select 1 from public.users u
   join public.role_permissions rp on rp.role=u.role and rp.permission=p_permission
   where u.id=auth.uid() and u.is_active and u.store_id is not null
 );
$$;

create function public.is_active_module(p_module_id text) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
 tenant uuid:=public.get_my_store_id();
 store_row public.stores;
 branch_row public.branches;
 module_row public.module_catalog;
 explicit_enabled boolean;
begin
 if tenant is null or p_module_id is null then return false; end if;
 select * into store_row from public.stores where id=tenant;
 if not found then return false; end if;
 if not ((store_row.subscription_status='trialing' and store_row.trial_ends_at>now())
   or (store_row.subscription_status in ('active','past_due') and store_row.subscription_ends_at is not null
     and store_row.subscription_ends_at+make_interval(days=>greatest(0,store_row.grace_period_days))>now())) then
   return false;
 end if;
 select * into branch_row from public.branches where store_id=tenant and is_primary;
 if not found then return false; end if;
 select * into module_row from public.module_catalog where id=p_module_id;
 if not found or module_row.implementation_status<>'available' then return false; end if;
 if module_row.required_feature is not null and
   coalesce(public.store_features(tenant)->>module_row.required_feature,'false')<>'true' then return false; end if;
 select enabled into explicit_enabled from public.module_activations
 where store_id=tenant and module_id=p_module_id
   and branch_id is not distinct from
     (case when module_row.scope='branch' then branch_row.id else null::uuid end);
 if found then return explicit_enabled; end if;
 return exists(select 1 from public.category_module_defaults
   where category_id=branch_row.category_id and module_id=p_module_id);
end $$;

create function public.require_active_module(p_module_id text,p_permission text) returns uuid
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare tenant uuid:=public.get_my_store_id();
begin
 if tenant is null or not public.has_store_permission(p_permission) then
   raise exception 'Permiso de módulo requerido' using errcode='42501';
 end if;
 perform 1 from public.stores where id=tenant for share;
 if not found or not public.is_active_module(p_module_id) then
   raise exception 'Módulo no habilitado' using errcode='42501';
 end if;
 return tenant;
end $$;

create function public.require_closeout_permission() returns uuid
language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare tenant uuid:=public.get_my_store_id();
begin
 if tenant is null or not public.has_store_permission('pos:manage_cash') then
   raise exception 'Permiso de cierre requerido' using errcode='42501';
 end if;
 perform 1 from public.stores where id=tenant for share;
 if not found then raise exception 'Tienda no disponible' using errcode='42501'; end if;
 return tenant;
end $$;

-- Activation edits and operational writes acquire the same tenant row. This
-- gives a deterministic cutover without locking every activation read.
create function public.lock_module_activation_change() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare tenant uuid:=case when TG_OP='DELETE' then old.store_id else new.store_id end;
begin
 perform 1 from public.stores where id=tenant for update;
 return case when TG_OP='DELETE' then old else new end;
end $$;
create trigger lock_module_activation_before_write
before insert or update or delete on public.module_activations
for each row execute function public.lock_module_activation_change();

revoke all on function public.has_store_permission(text),public.is_active_module(text),
 public.require_active_module(text,text),public.require_closeout_permission(),
 public.lock_module_activation_change() from public,anon,authenticated;
grant execute on function public.has_store_permission(text),public.is_active_module(text),
 public.require_active_module(text,text),public.require_closeout_permission() to authenticated;

commit;
