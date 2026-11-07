begin;

-- Preserve an explicit primary branch category when the store is renamed.
create or replace function public.sync_primary_branch_from_store()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.branches
  set name=new.name,
      category_id=case
        when TG_OP='INSERT' or new.business_type is distinct from old.business_type
          or new.industry_sub_type is distinct from old.industry_sub_type
        then public.legacy_store_category(new.business_type,new.industry_sub_type)
        else category_id end,
      updated_at=now()
  where store_id=new.id and is_primary;
  if not found then
    insert into public.branches(store_id,name,category_id,is_primary)
    values(new.id,new.name,public.legacy_store_category(new.business_type,new.industry_sub_type),true);
  end if;
  return new;
end $$;

-- Owners change their own available modules through one audited, atomic entry point.
-- Direct table writes remain denied to browser clients.
create function public.set_module_activation(p_store_id uuid,p_module_id text,p_enabled boolean)
returns void language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare definition public.module_catalog; target_branch uuid; activation_id uuid;
begin
  if auth.uid() is null or p_store_id is null or not exists(
    select 1 from public.users
    where id=auth.uid() and store_id=p_store_id and role='owner' and is_active
  ) then
    raise exception 'Solo el propietario activo puede configurar módulos' using errcode='42501';
  end if;
  perform 1 from public.stores where id=p_store_id for update;
  if not found then raise exception 'Tienda no encontrada' using errcode='42501'; end if;
  select * into definition from public.module_catalog where id=p_module_id;
  if not found or definition.implementation_status<>'available' then
    raise exception 'Módulo aún no disponible' using errcode='23514';
  end if;
  if p_module_id in ('dashboard','settings') and p_enabled=false then
    raise exception 'Este módulo de acceso básico no se puede desactivar' using errcode='23514';
  end if;
  if definition.scope='branch' then
    select id into target_branch from public.branches where store_id=p_store_id and is_primary;
    if target_branch is null then raise exception 'Sucursal principal no encontrada' using errcode='23514'; end if;
  end if;
  select id into activation_id from public.module_activations
    where store_id=p_store_id and module_id=p_module_id and branch_id is not distinct from target_branch;
  if p_enabled is null then
    if activation_id is not null then delete from public.module_activations where id=activation_id; end if;
  elsif activation_id is not null then
    update public.module_activations set enabled=p_enabled where id=activation_id;
  else
    insert into public.module_activations(store_id,branch_id,module_id,enabled)
    values(p_store_id,target_branch,p_module_id,p_enabled);
  end if;
end $$;
revoke all on function public.set_module_activation(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.set_module_activation(uuid,text,boolean) to authenticated;

commit;
