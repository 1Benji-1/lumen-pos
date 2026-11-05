-- Task 1 fixture is separate from stores A/B used by baseline and concurrency tests.
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000009','module-owner@test.invalid'),
 ('10000000-0000-0000-0000-000000000010','module-cashier@test.invalid'),
 ('10000000-0000-0000-0000-000000000011','module-stock@test.invalid');
insert into public.stores(id,name,owner_id,plan_id)
values ('20000000-0000-0000-0000-000000000004','Module fixture','10000000-0000-0000-0000-000000000009',
 (select id from public.plans where code='enterprise'));
insert into public.users(id,store_id,role,is_active) values
 ('10000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000004','owner',true),
 ('10000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000004','cashier',true),
 ('10000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000004','stock_clerk',true);

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
select test.ok('default_retail_pos_allowed', public.is_active_module('pos'));
select test.ok('default_retail_pos_write_authorized', public.require_active_module('pos','pos:access')='20000000-0000-0000-0000-000000000004');
select test.ok('unknown_or_planned_module_denied', not public.is_active_module('tables') and not public.is_active_module('unknown'));
reset role;

insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'pos',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
set role authenticated;
select test.ok('explicit_disable_denied', not public.is_active_module('pos'));
select test.rejects('explicit_disable_blocks_write', $$select public.require_active_module('pos','pos:access')$$);
reset role;

update public.branches set category_id='servicio_tecnico'
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
update public.module_activations set enabled=true
where store_id='20000000-0000-0000-0000-000000000004' and module_id='pos';
set role authenticated;
select test.ok('positive_category_override_allowed', public.is_active_module('pos'));
reset role;

update public.stores set plan_id=(select id from public.plans where code='standard')
where id='20000000-0000-0000-0000-000000000004';
set role authenticated;
select test.ok('standard_plan_cannot_gain_analytics', not public.is_active_module('analytics'));
reset role;
update public.stores set plan_id=(select id from public.plans where code='enterprise')
where id='20000000-0000-0000-0000-000000000004';

update public.users set is_active=false where id='10000000-0000-0000-0000-000000000009';
set role authenticated;
select test.ok('inactive_or_foreign_tenant_denied', not public.is_active_module('pos') and not public.has_store_permission('pos:access'));
reset role;
update public.users set is_active=true where id='10000000-0000-0000-0000-000000000009';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.ok('foreign_tenant_uses_own_disabled_pos',not public.is_active_module('pos'));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
reset role;

update public.branches set is_primary=false where store_id='20000000-0000-0000-0000-000000000004';
set role authenticated;
select test.ok('missing_primary_branch_denied', not public.is_active_module('pos'));
reset role;
update public.branches set is_primary=true where store_id='20000000-0000-0000-0000-000000000004';

update public.stores set trial_ends_at=now()-interval '1 day'
where id='20000000-0000-0000-0000-000000000004';
set role authenticated;
select test.rejects('expired_subscription_denies_write', $$select public.require_active_module('pos','pos:access')$$);
select test.ok('closeout_ignores_expiry_but_requires_active_role',
 public.require_closeout_permission()='20000000-0000-0000-0000-000000000004');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000011',false);
select test.rejects('closeout_rejects_stock_clerk', $$select public.require_closeout_permission()$$);
reset role;

do $$begin if exists(select 1 from test.results where not passed) then raise exception 'module authorization regression'; end if; end $$;
