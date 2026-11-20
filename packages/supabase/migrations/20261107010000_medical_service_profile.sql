begin;

alter table public.branches drop constraint branches_category_id_check;
alter table public.branches add constraint branches_category_id_check check (category_id in (
  'comercio_general','minimarket_abarrotes','ropa_calzado','ferreteria_construccion',
  'farmacia_belleza','libreria_papeleria','tecnologia_celulares','repuestos','tienda_mascotas',
  'restaurante_tradicional','cafeteria','bar','panaderia','comida_rapida','dark_kitchen',
  'barberia_belleza','lavanderia','taller','servicio_tecnico','consultorios_clinicas',
  'mayorista_general','distribuidor'
));

insert into public.module_catalog(id,scope,implementation_status,required_feature) values
  ('clinical_records','organization','planned',null),
  ('prescriptions','organization','planned',null),
  ('medical_documents','organization','planned',null);
insert into public.category_module_defaults(category_id,module_id) values
  ('consultorios_clinicas','dashboard'),('consultorios_clinicas','pos'),
  ('consultorios_clinicas','customers'),('consultorios_clinicas','staff'),
  ('consultorios_clinicas','analytics'),('consultorios_clinicas','settings'),
  ('consultorios_clinicas','agenda'),('consultorios_clinicas','clinical_records'),
  ('consultorios_clinicas','prescriptions'),('consultorios_clinicas','medical_documents');

-- Professional metadata is separate from patients and clinical records. The latter
-- have no storage or API until their access model is implemented and reviewed.
create table public.medical_professionals (
  user_id uuid primary key references public.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  specialties text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create index medical_professionals_store_idx on public.medical_professionals(store_id);
alter table public.medical_professionals enable row level security;
create policy medical_professionals_read on public.medical_professionals
  for select to authenticated using (
    store_id=public.get_my_store_id()
    and exists(select 1 from public.branches b where b.store_id=medical_professionals.store_id
      and b.is_primary and b.category_id='consultorios_clinicas')
  );
revoke all on public.medical_professionals from public,anon,authenticated;
grant select on public.medical_professionals to authenticated;
grant all on public.medical_professionals to service_role;

create function public.set_medical_specialties(p_user_id uuid,p_specialties text[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor_store uuid; target_store uuid;
begin
  select store_id into actor_store from public.users
  where id=auth.uid() and role='owner' and is_active;
  select store_id into target_store from public.users where id=p_user_id and is_active;
  if actor_store is null or target_store is distinct from actor_store or not exists (
    select 1 from public.branches where store_id=actor_store and is_primary
      and category_id='consultorios_clinicas'
  ) then raise exception 'No autorizado para configurar especialidades' using errcode='42501'; end if;
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
revoke all on function public.set_medical_specialties(uuid,text[]) from public,anon,authenticated;
grant execute on function public.set_medical_specialties(uuid,text[]) to authenticated;

commit;
