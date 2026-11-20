begin;

insert into auth.users(id,email) values ('10000000-0000-0000-0000-000000000091','area-health@test.invalid');
set local role service_role;
insert into public.stores(id,name,owner_id,plan_id)
values ('20000000-0000-0000-0000-000000000091','Área de Salud','10000000-0000-0000-0000-000000000091',
  (select id from public.plans where code='enterprise'));
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'pos',true from public.branches
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
update public.branches set category_id='consultorios_clinicas'
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
insert into public.users(id,store_id,role,is_active)
values ('10000000-0000-0000-0000-000000000091','20000000-0000-0000-0000-000000000091','owner',true);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000091',true);
select test.ok('new health reads only its own area context', (
  select count(*)=1 and bool_and(area_id='health' and not compatibility_mode
    and store_id='20000000-0000-0000-0000-000000000091')
  from public.get_organization_area_context()
));
select test.ok('health base includes staff but not commercial or unfinished modules',
  public.is_active_module('staff') and not public.is_active_module('pos')
  and not public.is_active_module('inventory') and not public.is_active_module('agenda'));
select test.rejects('organization owners cannot change legacy access classification',
  $$update public.stores set business_type='restaurante' where id='20000000-0000-0000-0000-000000000091'$$);
select test.rejects('organization owners cannot change legacy industry classification',
  $$update public.stores set industry_sub_type='ferreteria_construccion' where id='20000000-0000-0000-0000-000000000091'$$);
with renamed as (
  update public.stores set name='Área de Salud renombrada'
  where id='20000000-0000-0000-0000-000000000091'
  returning id
)
select test.ok('the owner can still rename the organization and retain its area',
  (select count(*)=1 from renamed) and (select area_id='health' from public.get_organization_area_context()));
select test.rejects('health activation cannot enable an out-of-area module',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000091','pos',true)$$);
select test.rejects('health write authorization rejects inactive commercial modules',
  $$select public.require_active_module('pos','pos:access')$$);
select test.ok('authenticated users have no direct writes to area profiles',
  not has_table_privilege('authenticated','public.organization_access_profiles','UPDATE'));
select test.ok('anonymous users have no area context grant',
  not has_function_privilege('anon','public.get_organization_area_context()','EXECUTE'));
reset role;

update public.organization_access_profiles set managed_by_category=false
where store_id='20000000-0000-0000-0000-000000000091';
update public.branches set category_id='dark_kitchen'
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
set local role authenticated;
select test.ok('an explicitly assigned area ignores changes to a legacy category', (
  select area_id='health' and not compatibility_mode from public.get_organization_area_context()
) and not public.is_active_module('pos'));
reset role;
update public.organization_access_profiles set managed_by_category=true
where store_id='20000000-0000-0000-0000-000000000091';
update public.branches set category_id='comida_rapida'
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
update public.branches set category_id='dark_kitchen'
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000091' and module_id='pos';
set local role authenticated;
select test.ok('dark kitchen keeps its operational defaults in gastronomy', (
  select area_id='gastronomy' and compatibility_mode
    and 'inventory'=any(default_module_ids) and not ('pos'=any(default_module_ids))
  from public.get_organization_area_context()
));
select test.ok('dark kitchen retains inventory and does not gain sales by default',
  public.is_active_module('inventory') and not public.is_active_module('pos'));
reset role;

update public.branches set category_id='barberia_belleza'
where store_id='20000000-0000-0000-0000-000000000091' and is_primary;
set local role authenticated;
select test.ok('ordinary services keep a compatibility profile outside Salud', (
  select area_id is null and compatibility_mode from public.get_organization_area_context()
));
select test.ok('ordinary services keep existing modules', public.is_active_module('pos') and not public.is_active_module('inventory'));
reset role;

do $$begin
  if exists(select 1 from test.results where not passed) then raise exception 'organization area regressions'; end if;
end $$;
rollback;
