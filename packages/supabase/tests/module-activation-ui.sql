set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.set_module_activation('20000000-0000-0000-0000-000000000001','inventory',false);
select test.ok('owner can disable a branch module through the secure RPC',
  exists(select 1 from public.module_activations where store_id='20000000-0000-0000-0000-000000000001'
    and module_id='inventory' and enabled=false and branch_id is not null));
select public.set_module_activation('20000000-0000-0000-0000-000000000001','inventory',true);
select test.ok('owner can reactivate a branch module',
  exists(select 1 from public.module_activations where store_id='20000000-0000-0000-0000-000000000001'
    and module_id='inventory' and enabled=true and branch_id is not null));
select public.set_module_activation('20000000-0000-0000-0000-000000000001','inventory',null);
select test.ok('owner can restore the category default',
  not exists(select 1 from public.module_activations where store_id='20000000-0000-0000-0000-000000000001' and module_id='inventory')
  and exists(select 1 from public.module_activation_audit where store_id='20000000-0000-0000-0000-000000000001'
    and module_id='inventory' and operation='DELETE'));
select test.rejects('owner cannot edit another store',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000002','inventory',false)$$);
select test.rejects('owner cannot disable access to configuration',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000001','settings',false)$$);
select test.rejects('planned module cannot be toggled',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000001','kitchen',true)$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('cashier cannot change activations',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000001','inventory',false)$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',false);
select test.rejects('store admin cannot change owner activations',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000001','inventory',false)$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.rejects('plan exclusion cannot be bypassed by owner',
  $$select public.set_module_activation('20000000-0000-0000-0000-000000000002','analytics',true)$$);
reset role;
do $$begin if exists(select 1 from test.results where not passed) then raise exception 'activation UI regression'; end if; end $$;
