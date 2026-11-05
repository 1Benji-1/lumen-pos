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

-- Direct-write authorization probes. `test.denied` checks the access error,
-- not merely an arbitrary constraint failure.
create function test.denied(name text,statement text) returns void language plpgsql as $$
begin
 begin
  execute statement;
  perform test.ok(name,false);
 exception when others then
  perform test.ok(name,SQLSTATE='42501');
 end;
end $$;
grant execute on function test.denied(text,text) to authenticated;
update public.stores set trial_ends_at=now()+interval '7 days'
where id='20000000-0000-0000-0000-000000000004';
update public.branches set category_id='comercio_general'
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
delete from public.module_activations
where store_id='20000000-0000-0000-0000-000000000004' and module_id='pos';
insert into public.products(id,store_id,name) values
 ('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','Module product');
insert into public.product_variants(id,store_id,product_id,cost_price,sale_price,stock_quantity) values
 ('50000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004',4,10,10);
insert into public.suppliers(id,store_id,name) values
 ('80000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','Module supplier');
insert into public.customers(id,store_id,full_name) values
 ('60000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','Module customer');
insert into public.cash_registers(id,store_id,opened_by) values
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000010');

insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'inventory',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
select test.denied('disabled_inventory_blocks_direct_product_write',
 $$update public.products set name='blocked' where id='40000000-0000-0000-0000-000000000004'$$);
select test.denied('disabled_inventory_blocks_direct_variant_write',
 $$update public.product_variants set sale_price=1 where id='50000000-0000-0000-0000-000000000004'$$);
select test.denied('disabled_inventory_blocks_direct_supplier_write',
 $$insert into public.suppliers(store_id,name) values('20000000-0000-0000-0000-000000000004','blocked')$$);
select test.denied('disabled_inventory_blocks_purchase_orders_even_with_feature',
 $$insert into public.purchase_orders(store_id,supplier_id,order_number,status)
   values('20000000-0000-0000-0000-000000000004','80000000-0000-0000-0000-000000000004','BLOCKED','draft')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000010',false);
do $$declare sale_id uuid; begin
 begin
  select public.create_sale('30000000-0000-0000-0000-000000000004','cash',
    '[{"product_variant_id":"50000000-0000-0000-0000-000000000004","quantity":1,"unit_price":10}]'::jsonb)
    into sale_id;
  perform test.ok('pos_sale_stock_side_effect_does_not_require_inventory_activation',
    sale_id is not null and (select stock_quantity=9 from public.product_variants where id='50000000-0000-0000-0000-000000000004'));
 exception when others then
  raise notice 'POS stock side effect failed: % (%)',SQLERRM,SQLSTATE;
  perform test.ok('pos_sale_stock_side_effect_does_not_require_inventory_activation',false);
 end;
end $$;
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='inventory';

insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000004','customers',false);
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
select test.denied('disabled_customers_blocks_direct_mutation',
 $$update public.customers set full_name='blocked' where id='60000000-0000-0000-0000-000000000004'$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='customers';

insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000004','staff',false);
set role authenticated;
select test.denied('disabled_staff_blocks_profile_mutation',
 $$update public.users set full_name='blocked' where id='10000000-0000-0000-0000-000000000010'$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='staff';

insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000004','settings',false);
set role authenticated;
select test.denied('disabled_settings_blocks_store_mutation',
 $$update public.stores set name='blocked' where id='20000000-0000-0000-0000-000000000004'$$);
select test.denied('disabled_settings_blocks_settings_mutation',
 $$update public.store_settings set timezone='UTC' where store_id='20000000-0000-0000-0000-000000000004'$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='settings';

insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'pos',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
set role authenticated;
select test.denied('disabled_pos_blocks_open_register',
 $$insert into public.cash_registers(store_id,opened_by)
   values('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000009')$$);
select test.denied('disabled_pos_blocks_cash_movement',
 $$insert into public.cash_movements(store_id,cash_register_id,type,amount,reason,performed_by)
   values('20000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004','in',1,'blocked','10000000-0000-0000-0000-000000000009')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000010',false);
update public.cash_registers set status='closed',closed_at=now(),closing_amount=0
where id='30000000-0000-0000-0000-000000000004';
select test.ok('closeout_allows_existing_own_register_after_disable',
 (select status='closed' from public.cash_registers where id='30000000-0000-0000-0000-000000000004'));
select test.denied('closeout_rejects_modification_to_closed_register',
 $$update public.cash_registers set closing_amount=1 where id='30000000-0000-0000-0000-000000000004'$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='pos';
insert into public.purchase_orders(id,store_id,supplier_id,order_number,status)
values ('90000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004',
 '80000000-0000-0000-0000-000000000004','CASCADE-MODULE','draft');
insert into public.purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal)
values ('90000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004',1,4,4);
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
delete from public.purchase_orders where id='90000000-0000-0000-0000-000000000004';
select test.ok('authorized_draft_order_delete_cascades_items',
 not exists(select 1 from public.purchase_order_items where purchase_order_id='90000000-0000-0000-0000-000000000004'));
reset role;
insert into public.cash_registers(id,store_id,opened_by) values
 ('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000010');
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'pos',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
update public.stores set trial_ends_at=now()-interval '1 day'
where id='20000000-0000-0000-0000-000000000004';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000010',false);
update public.cash_registers set status='closed',closed_at=now(),closing_amount=0
where id='30000000-0000-0000-0000-000000000005';
select test.ok('closeout_survives_module_and_subscription_pause',
 (select status='closed' from public.cash_registers where id='30000000-0000-0000-0000-000000000005'));
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='pos';
update public.stores set trial_ends_at=now()+interval '7 days'
where id='20000000-0000-0000-0000-000000000004';
-- Transactional RPC entry points must perform their own module check.
insert into public.cash_registers(id,store_id,opened_by) values
 ('30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000010');
create function test.module_sale(p_key text) returns uuid language sql as $$
 select public.create_sale('30000000-0000-0000-0000-000000000006','cash',
 '[{"product_variant_id":"50000000-0000-0000-0000-000000000004","quantity":1,"unit_price":10}]'::jsonb,
 p_idempotency_key=>p_key);
$$;
grant execute on function test.module_sale(text) to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000010',false);
select test.module_sale('module-replay');
reset role;
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'pos',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
set role authenticated;
select test.denied('disabled_pos_blocks_sale', $$select test.module_sale('module-new')$$);
select test.denied('new_offline_sale_denied_after_disable',
 $$select public.create_sale('30000000-0000-0000-0000-000000000006','cash',
 '[{"product_variant_id":"50000000-0000-0000-0000-000000000004","quantity":1,"unit_price":10}]',
 p_idempotency_key=>'module-offline',p_created_at=>now()-interval '1 minute')$$);
select test.ok('same_author_existing_key_returns_same_sale_after_disable',
 test.module_sale('module-replay')=(select id from public.sales where store_id='20000000-0000-0000-0000-000000000004' and idempotency_key='module-replay'));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
select test.denied('disabled_pos_blocks_refund',
 $$select public.refund_sale((select id from public.sales where store_id='20000000-0000-0000-0000-000000000004' and idempotency_key='module-replay'))$$);
select test.denied('different_author_cannot_replay', $$select test.module_sale('module-replay')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000010',false);
select test.denied('different_register_cannot_replay',
 $$select public.create_sale('30000000-0000-0000-0000-000000000004','cash',
 '[{"product_variant_id":"50000000-0000-0000-0000-000000000004","quantity":1,"unit_price":10}]',
 p_idempotency_key=>'module-replay')$$);
reset role;
update public.stores set trial_ends_at=now()-interval '1 day'
where id='20000000-0000-0000-0000-000000000004';
set role authenticated;
select test.ok('same_author_existing_key_returns_same_sale_after_expiry',
 test.module_sale('module-replay')=(select id from public.sales where store_id='20000000-0000-0000-0000-000000000004' and idempotency_key='module-replay'));
select test.denied('new_sale_denied_after_expiry', $$select test.module_sale('module-expired-new')$$);
reset role;
update public.stores set trial_ends_at=now()+interval '7 days'
where id='20000000-0000-0000-0000-000000000004';
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='pos';

insert into public.purchase_orders(id,store_id,supplier_id,order_number,status)
values ('90000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000004',
 '80000000-0000-0000-0000-000000000004','RPC-MODULE','draft');
insert into public.purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal)
values ('90000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000004',1,4,4);
insert into public.module_activations(store_id,branch_id,module_id,enabled)
select store_id,id,'inventory',false from public.branches
where store_id='20000000-0000-0000-0000-000000000004' and is_primary;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000009',false);
select test.denied('disabled_inventory_blocks_adjust_rpc',
 $$select public.adjust_variant_stock('50000000-0000-0000-0000-000000000004',2,'manual_adjustment')$$);
select test.denied('disabled_inventory_blocks_product_create_rpc',
 $$select public.create_product_with_variant('{"name":"blocked RPC"}','{"sale_price":1}')$$);
select test.denied('disabled_inventory_blocks_receipt_rpc',
 $$select public.receive_purchase_order('90000000-0000-0000-0000-000000000005')$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='inventory';

insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000004','customers',false);
set role authenticated;
select test.denied('disabled_customers_blocks_duplicate_rpc',
 $$select * from public.check_duplicate_customer('20000000-0000-0000-0000-000000000004','123')$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='customers';

insert into public.module_activations(store_id,module_id,enabled)
values ('20000000-0000-0000-0000-000000000004','analytics',false);
set role authenticated;
select test.denied('disabled_analytics_blocks_report_rpc',
 $$select public.get_store_analytics(now()-interval '1 day',now())$$);
reset role;
delete from public.module_activations where store_id='20000000-0000-0000-0000-000000000004' and module_id='analytics';
select test.ok('unknown_legacy_overload_not_executable',
 to_regprocedure('public.create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text)') is null);
-- The phase-2 persistence test left A/B POS disabled to inspect those rows.
-- Restore their defaults before the baseline concurrency suite uses them.
delete from public.module_activations
where store_id in ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002')
 and module_id='pos';

do $$begin if exists(select 1 from test.results where not passed) then raise exception 'module authorization regression'; end if; end $$;
