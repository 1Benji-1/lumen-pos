begin;

-- This is an organization policy. The primary branch remains the storage
-- scope of historical activation rows and the adapter for legacy provisioning.
create table public.organization_access_profiles (
  store_id uuid primary key references public.stores(id) on delete cascade,
  area_id text check (area_id in ('commerce','gastronomy','health')),
  legacy_module_ids text[],
  managed_by_category boolean not null default true,
  check (area_id is not null or legacy_module_ids is not null),
  check (managed_by_category or (area_id is not null and legacy_module_ids is null))
);
alter table public.organization_access_profiles enable row level security;
revoke all on public.organization_access_profiles from public,anon,authenticated,service_role;

create function public.area_for_legacy_category(p_category text)
returns text language sql immutable set search_path=public,pg_temp as $$
  select case
    when p_category='consultorios_clinicas' then 'health'
    when p_category in ('restaurante_tradicional','cafeteria','bar','panaderia','comida_rapida','dark_kitchen') then 'gastronomy'
    when p_category in ('comercio_general','minimarket_abarrotes','ropa_calzado','ferreteria_construccion',
      'farmacia_belleza','libreria_papeleria','tecnologia_celulares','repuestos','tienda_mascotas',
      'mayorista_general','distribuidor') then 'commerce'
    else null
  end
$$;

create function public.default_modules_for_area(p_area text)
returns text[] language sql immutable set search_path=public,pg_temp as $$
  select case p_area
    when 'commerce' then array['dashboard','pos','inventory','customers','analytics','staff','settings']
    when 'gastronomy' then array['dashboard','pos','inventory','customers','analytics','staff','settings','orders','kitchen','tables','recipes']
    when 'health' then array['dashboard','staff','settings','agenda','clinical_records','prescriptions','medical_documents']
    else array[]::text[]
  end
$$;

-- Capture a compatibility catalog only when area defaults would change an
-- already available module. Planned modules never confer access.
create function public.legacy_area_module_catalog(p_category text,p_area text)
returns text[] language sql stable set search_path=public,pg_temp as $$
  with legacy as (
    select d.module_id, m.implementation_status
    from public.category_module_defaults d join public.module_catalog m on m.id=d.module_id
    where d.category_id=p_category
  ), area_available as (
    select id from public.module_catalog
    where implementation_status='available' and id=any(public.default_modules_for_area(p_area))
  )
  select case when p_area is null or exists (
    (select module_id from legacy where implementation_status='available' except select id from area_available)
    union all
    (select id from area_available except select module_id from legacy where implementation_status='available')
  ) then array(select module_id from legacy order by module_id) end
$$;

create function public.sync_organization_area_from_category()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare selected_area text;
begin
  if not new.is_primary then return new; end if;
  if tg_op='UPDATE' and old.is_primary and old.category_id=new.category_id then return new; end if;

  selected_area:=public.area_for_legacy_category(new.category_id);
  insert into public.organization_access_profiles(store_id,area_id,legacy_module_ids)
  values(new.store_id,selected_area,
    case when selected_area='health' then null
      else public.legacy_area_module_catalog(new.category_id,selected_area) end)
  on conflict(store_id) do update
  set area_id=excluded.area_id, legacy_module_ids=excluded.legacy_module_ids
  where public.organization_access_profiles.managed_by_category;
  return new;
end $$;

create trigger sync_organization_area_after_category_write
after insert or update of category_id,is_primary on public.branches
for each row execute function public.sync_organization_area_from_category();

with existing as (
  select store_id,category_id,public.area_for_legacy_category(category_id) as area_id
  from public.branches where is_primary
)
insert into public.organization_access_profiles(store_id,area_id,legacy_module_ids)
select store_id,area_id,public.legacy_area_module_catalog(category_id,area_id) from existing;

-- Operational writes and activation changes already lock the organization.
-- Use the same row to serialize changes to its published area policy.
-- Legacy category writes can hold the branch row first. Do not wait on a
-- concurrent organization edit that may itself be waiting for that branch.
create function public.lock_organization_area_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.stores where id=new.store_id for update nowait;
  return new;
end $$;

create trigger lock_organization_area_before_write
before insert or update on public.organization_access_profiles
for each row execute function public.lock_organization_area_change();

-- Legacy classification is a provisioning input, separate from profile edits.
create function public.guard_legacy_area_classification()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if current_user in ('authenticated','anon') and not public.is_super_admin()
    and (new.business_type is distinct from old.business_type
      or new.industry_sub_type is distinct from old.industry_sub_type) then
    raise exception 'Solo administración puede cambiar la clasificación de la organización' using errcode='42501';
  end if;
  return new;
end $$;

create trigger guard_area_classification_before_store_write
before update of business_type,industry_sub_type on public.stores
for each row execute function public.guard_legacy_area_classification();

revoke all on function public.area_for_legacy_category(text),public.default_modules_for_area(text),
  public.legacy_area_module_catalog(text,text),public.sync_organization_area_from_category(),
  public.lock_organization_area_change(),public.guard_legacy_area_classification()
  from public,anon,authenticated;

-- The caller supplies no tenant id. A missing or inactive membership yields no row.
create function public.get_organization_area_context()
returns table(store_id uuid,branch_id uuid,area_id text,default_module_ids text[],compatibility_mode boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.store_id,b.id,p.area_id,
    coalesce(p.legacy_module_ids,public.default_modules_for_area(p.area_id)),
    p.legacy_module_ids is not null
  from public.organization_access_profiles p
  join public.branches b on b.store_id=p.store_id and b.is_primary
  where p.store_id=public.get_my_store_id()
$$;

revoke all on function public.get_organization_area_context() from public,anon,authenticated;
grant execute on function public.get_organization_area_context() to authenticated;

create or replace function public.is_active_module(p_module_id text) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
 tenant uuid:=public.get_my_store_id();
 store_row public.stores;
 module_row public.module_catalog;
 explicit_enabled boolean;
 area_context record;
begin
 if tenant is null or p_module_id is null then return false; end if;
 select * into store_row from public.stores where id=tenant;
 if not found then return false; end if;
 if not ((store_row.subscription_status='trialing' and store_row.trial_ends_at>now())
   or (store_row.subscription_status in ('active','past_due') and store_row.subscription_ends_at is not null
     and store_row.subscription_ends_at+make_interval(days=>greatest(0,store_row.grace_period_days))>now())) then
   return false;
 end if;
 select * into area_context from public.get_organization_area_context();
 if not found then return false; end if;
 select * into module_row from public.module_catalog where id=p_module_id;
 if not found or module_row.implementation_status<>'available' then return false; end if;
 if module_row.required_feature is not null and
   coalesce(public.store_features(tenant)->>module_row.required_feature,'false')<>'true' then return false; end if;
 if not area_context.compatibility_mode
   and not (p_module_id=any(area_context.default_module_ids)) then return false; end if;
 select enabled into explicit_enabled from public.module_activations
 where store_id=tenant and module_id=p_module_id
   and branch_id is not distinct from
     (case when module_row.scope='branch' then area_context.branch_id else null::uuid end);
 if found then return explicit_enabled; end if;
 return p_module_id=any(area_context.default_module_ids);
end $$;

-- The existing lock trigger runs before this one. Existing audited overrides
-- stay readable. Only a positive override outside the native area is denied.
create function public.guard_area_activation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.enabled and exists (
    select 1 from public.organization_access_profiles p
    where p.store_id=new.store_id and p.legacy_module_ids is null
      and not (new.module_id=any(public.default_modules_for_area(p.area_id)))
  ) then
    raise exception 'El módulo no pertenece al área de la organización' using errcode='23514';
  end if;
  return new;
end $$;

create trigger module_area_activation_before_write
before insert or update on public.module_activations
for each row execute function public.guard_area_activation();
revoke all on function public.guard_area_activation() from public,anon,authenticated;

alter policy medical_professionals_read on public.medical_professionals using (
  exists(select 1 from public.get_organization_area_context() current_area
    where current_area.store_id=medical_professionals.store_id and current_area.area_id='health')
);

create or replace function public.set_medical_specialties(p_user_id uuid,p_specialties text[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_store uuid; target_store uuid;
begin
  select store_id into actor_store from public.users
  where id=auth.uid() and role='owner' and is_active;
  select store_id into target_store from public.users where id=p_user_id and is_active;
  if actor_store is null or target_store is distinct from actor_store then raise exception 'No autorizado para configurar especialidades' using errcode='42501'; end if;
  perform public.require_active_module('staff','staff:manage');
  if not exists (select 1 from public.get_organization_area_context() where area_id='health')
  then raise exception 'No autorizado para configurar especialidades' using errcode='42501'; end if;
  if p_specialties is null or cardinality(p_specialties)>5 or exists (
    select 1 from unnest(p_specialties) s where s is null or s not in (
      'medicina_general','odontologia','psicologia','pediatria','fisioterapia',
      'nutricion','dermatologia','otra'
    )
  ) or cardinality(p_specialties)<>(select count(distinct s) from unnest(p_specialties) s)
  then raise exception 'Especialidades no válidas' using errcode='23514'; end if;
  insert into public.medical_professionals(user_id,store_id,specialties)
  values(p_user_id,actor_store,p_specialties)
  on conflict(user_id) do update set specialties=excluded.specialties,updated_at=now();
end $$;

commit;
