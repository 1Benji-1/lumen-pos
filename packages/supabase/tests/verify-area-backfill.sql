begin;

update public.stores set name='Consultorio anterior renombrado'
where id='20000000-0000-0000-0000-000000000090';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000090',true);
do $$begin
  if not exists (
    select 1 from public.get_organization_area_context()
    where area_id='health' and compatibility_mode and 'pos'=any(default_module_ids)
  ) or not public.is_active_module('pos') then
    raise exception 'migrated clinic lost prior sales access';
  end if;
  raise notice 'PASS: migrated clinic preserves prior sales after a name change';
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);

-- Remove only these synthetic rows before the independent baseline fixtures.
delete from public.users where id='10000000-0000-0000-0000-000000000090';
delete from public.stores where id='20000000-0000-0000-0000-000000000090';
delete from auth.users where id='10000000-0000-0000-0000-000000000090';

commit;
