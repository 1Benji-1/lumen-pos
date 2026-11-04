-- Test persisted exceptions through the real schema, RLS, plan data and audit triggers.
select test.ok('new stores start with category defaults, not copied activations',
  (select count(*)=0 from public.module_activations));

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000001','dashboard',false);
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select '20000000-0000-0000-0000-000000000001',id,'pos',false
from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary;
insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000001','analytics',true);
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select '20000000-0000-0000-0000-000000000002',id,'pos',false
from public.branches where store_id='20000000-0000-0000-0000-000000000002' and is_primary;
select test.ok('privileged writes can record organization and branch exceptions',
  (select count(*)=3 from public.module_activations where store_id='20000000-0000-0000-0000-000000000001'));
do $$begin
  begin
    insert into public.module_activations(store_id,branch_id,module_id,enabled)
    select '20000000-0000-0000-0000-000000000001',id,'inventory',true
    from public.branches where store_id='20000000-0000-0000-0000-000000000002' and is_primary;
    perform test.ok('cross-tenant branch activation is rejected by tenant FK',false);
  exception when foreign_key_violation then
    perform test.ok('cross-tenant branch activation is rejected by tenant FK',true);
  end;
end $$;
select test.rejects('organization module cannot be branch scoped',
  $$insert into public.module_activations(store_id,branch_id,module_id,enabled)
    select '20000000-0000-0000-0000-000000000001',id,'customers',false
    from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary$$);
select test.rejects('branch module cannot be organization scoped',
  $$insert into public.module_activations(store_id,module_id,enabled)
    values ('20000000-0000-0000-0000-000000000001','inventory',false)$$);
select test.rejects('planned module cannot be activated',
  $$insert into public.module_activations(store_id,branch_id,module_id,enabled)
    select '20000000-0000-0000-0000-000000000001',id,'tables',true
    from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary$$);
select test.rejects('standard plan cannot activate advanced analytics',
  $$insert into public.module_activations(store_id,module_id,enabled)
    values ('20000000-0000-0000-0000-000000000002','analytics',true)$$);
select test.rejects('unknown module cannot be persisted',
  $$insert into public.module_activations(store_id,module_id,enabled)
    values ('20000000-0000-0000-0000-000000000001','imaginary',true)$$);
select test.rejects('duplicate organization exception is rejected',
  $$insert into public.module_activations(store_id,module_id,enabled)
    values ('20000000-0000-0000-0000-000000000001','dashboard',false)$$);

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.ok('owner reads only own activation exceptions',
  (select count(*)=3 from public.module_activations)
  and not exists(select 1 from public.module_activations where store_id='20000000-0000-0000-0000-000000000002'));
select test.rejects('owner cannot insert an activation directly',
  $$insert into public.module_activations(store_id,module_id,enabled)
    values ('20000000-0000-0000-0000-000000000001','staff',false)$$);
with changed as (
  update public.module_activations set enabled=true where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard' returning id
) select test.ok('owner cannot update activations directly',not exists(select 1 from changed));
with removed as (
  delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard' returning id
) select test.ok('owner cannot delete activations directly',not exists(select 1 from removed));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select test.ok('inactive profile cannot read activation exceptions',(select count(*)=0 from public.module_activations));
reset role;

update public.module_activations set enabled=true
where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard';
delete from public.module_activations
where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard';
select test.ok('activation audit keeps insert update and delete history',
  (select count(*)=3 from public.module_activation_audit
   where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard')
  and exists(select 1 from public.module_activation_audit
   where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard'
     and operation='UPDATE' and old_enabled=false and new_enabled=true)
  and exists(select 1 from public.module_activation_audit
   where store_id='20000000-0000-0000-0000-000000000001' and module_id='dashboard'
     and operation='DELETE' and old_enabled=true and new_enabled is null));

do $$begin if exists(select 1 from test.results where not passed) then raise exception 'module activation regression'; end if; end $$;
