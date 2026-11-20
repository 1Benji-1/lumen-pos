begin;

create or replace function public.set_medical_specialties(p_user_id uuid,p_specialties text[])
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
  perform public.require_active_module('staff','staff:manage');
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
