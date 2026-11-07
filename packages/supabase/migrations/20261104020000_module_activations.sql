begin;

-- SQL-side module metadata validates persisted configuration. The web's
-- MODULE_REGISTRY supplies presentation and is checked against these rows.
create table public.module_catalog (
  id text primary key,
  scope text not null check (scope in ('organization','branch')),
  implementation_status text not null check (implementation_status in ('available','planned')),
  required_feature text
);
insert into public.module_catalog(id,scope,implementation_status,required_feature) values
 ('dashboard','organization','available',null),
 ('pos','branch','available',null),
 ('inventory','branch','available',null),
 ('customers','organization','available',null),
 ('analytics','organization','available','advanced_analytics'),
 ('staff','organization','available',null),
 ('settings','organization','available',null),
 ('cash','branch','planned',null),
 ('orders','branch','planned',null),
 ('purchases','organization','planned',null),
 ('online_commerce','organization','planned',null),
 ('delivery','branch','planned',null),
 ('credit','organization','planned',null),
 ('loyalty','organization','planned',null),
 ('multi_branch','organization','planned',null),
 ('integrations','organization','planned',null),
 ('agenda','branch','planned',null),
 ('work_orders','branch','planned',null),
 ('kitchen','branch','planned',null),
 ('recipes','branch','planned',null),
 ('tables','branch','planned',null),
 ('scales','branch','planned',null),
 ('quotes','branch','planned',null);

create table public.module_activations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  branch_id uuid,
  module_id text not null references public.module_catalog(id),
  enabled boolean not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (branch_id,store_id) references public.branches(id,store_id) on delete cascade
);
create unique index module_activations_organization_unique
  on public.module_activations(store_id,module_id) where branch_id is null;
create unique index module_activations_branch_unique
  on public.module_activations(branch_id,module_id) where branch_id is not null;
create index module_activations_store_idx on public.module_activations(store_id);

create function public.validate_module_activation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare definition public.module_catalog;
begin
  if TG_OP='UPDATE' and (new.id is distinct from old.id or new.store_id is distinct from old.store_id
      or new.branch_id is distinct from old.branch_id or new.module_id is distinct from old.module_id) then
    raise exception 'La identidad de la activación no puede cambiar' using errcode='23514';
  end if;
  select * into definition from public.module_catalog where id=new.module_id;
  if not found or definition.implementation_status<>'available' then
    raise exception 'Módulo aún no disponible' using errcode='23514';
  end if;
  if (definition.scope='branch') <> (new.branch_id is not null) then
    raise exception 'Ámbito de activación incorrecto' using errcode='23514';
  end if;
  if new.enabled and definition.required_feature is not null and
    coalesce(public.store_features(new.store_id)->definition.required_feature,'false'::jsonb)<>'true'::jsonb then
    raise exception 'El plan no habilita el módulo' using errcode='23514';
  end if;
  new.updated_at:=now();
  new.updated_by:=coalesce(auth.uid(),new.updated_by);
  return new;
end $$;
create trigger validate_module_activation_before_write
before insert or update on public.module_activations
for each row execute function public.validate_module_activation();

create table public.module_activation_audit (
  id bigint generated always as identity primary key,
  activation_id uuid not null,
  store_id uuid not null references public.stores(id) on delete cascade,
  branch_id uuid,
  module_id text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  old_enabled boolean,
  new_enabled boolean,
  actor_id uuid,
  changed_at timestamptz not null default now()
);
create index module_activation_audit_store_idx on public.module_activation_audit(store_id,changed_at);
create function public.audit_module_activation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- A tenant deletion also removes its audit history. A cascading activation
  -- DELETE must not insert a new audit row for the already-deleted parent.
  if TG_OP='DELETE' and not exists(select 1 from public.stores where id=old.store_id) then
    return old;
  end if;
  insert into public.module_activation_audit
    (activation_id,store_id,branch_id,module_id,operation,old_enabled,new_enabled,actor_id)
  values
    (coalesce(new.id,old.id),coalesce(new.store_id,old.store_id),coalesce(new.branch_id,old.branch_id),
     coalesce(new.module_id,old.module_id),TG_OP,
     case when TG_OP='INSERT' then null else old.enabled end,
     case when TG_OP='DELETE' then null else new.enabled end,
     coalesce(auth.uid(),new.updated_by,old.updated_by));
  return coalesce(new,old);
end $$;
create trigger audit_module_activation_after_write
after insert or update or delete on public.module_activations
for each row execute function public.audit_module_activation();

alter table public.module_catalog enable row level security;
alter table public.module_activations enable row level security;
alter table public.module_activation_audit enable row level security;
create policy "Read module catalog" on public.module_catalog for select to authenticated using (true);
create policy "Read own activation exceptions" on public.module_activations for select to authenticated
using (store_id=public.get_my_store_id() or public.is_super_admin());
create policy "Read own activation audit" on public.module_activation_audit for select to authenticated
using (store_id=public.get_my_store_id() or public.is_super_admin());
revoke all on public.module_catalog,public.module_activations,public.module_activation_audit from public,anon,authenticated;
grant select on public.module_catalog,public.module_activations,public.module_activation_audit to authenticated;
grant all on public.module_catalog,public.module_activations to service_role;
grant select on public.module_activation_audit to service_role;
revoke all on function public.validate_module_activation() from public,anon,authenticated;
revoke all on function public.audit_module_activation() from public,anon,authenticated;

commit;
