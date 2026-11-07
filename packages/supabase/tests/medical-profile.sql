select test.ok('medical category accepts an isolated primary branch',
  exists(select 1 from public.category_module_defaults where category_id='consultorios_clinicas' and module_id='clinical_records')
  and exists(select 1 from public.module_catalog where id='clinical_records' and implementation_status='planned'));
update public.branches set category_id='consultorios_clinicas'
where store_id='20000000-0000-0000-0000-000000000001' and is_primary;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select public.set_medical_specialties('10000000-0000-0000-0000-000000000005',array['medicina_general','pediatria']);
select test.ok('owner assigns multiple specialties to own professional independent of plan',
  exists(select 1 from public.medical_professionals where user_id='10000000-0000-0000-0000-000000000005'
    and specialties=array['medicina_general','pediatria']));
select test.rejects('owner cannot assign specialties across tenants',
  $$select public.set_medical_specialties('10000000-0000-0000-0000-000000000002',array['medicina_general'])$$);
select test.rejects('unknown specialty is rejected',
  $$select public.set_medical_specialties('10000000-0000-0000-0000-000000000005',array['inventada'])$$);
select test.rejects('direct specialty writes are forbidden',
  $$update public.medical_professionals set specialties=array['odontologia'] where user_id='10000000-0000-0000-0000-000000000005'$$);
select public.set_module_activation('20000000-0000-0000-0000-000000000001','staff',false);
select test.rejects('disabled staff module blocks specialty changes',
  $$select public.set_medical_specialties('10000000-0000-0000-0000-000000000005',array['odontologia'])$$);
select public.set_module_activation('20000000-0000-0000-0000-000000000001','staff',null);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('cashier cannot set medical specialties',
  $$select public.set_medical_specialties('10000000-0000-0000-0000-000000000003',array['medicina_general'])$$);
select test.ok('cashier can see assigned public professional specialties',
  exists(select 1 from public.medical_professionals where user_id='10000000-0000-0000-0000-000000000005'));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.ok('other tenant cannot read professional specialties',
  not exists(select 1 from public.medical_professionals where user_id='10000000-0000-0000-0000-000000000005'));
reset role;
update public.branches set category_id='comercio_general'
where store_id='20000000-0000-0000-0000-000000000001' and is_primary;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.rejects('ordinary services cannot assign medical specialties',
  $$select public.set_medical_specialties('10000000-0000-0000-0000-000000000005',array['medicina_general'])$$);
reset role;
do $$begin if exists(select 1 from test.results where not passed) then raise exception 'medical profile regression'; end if; end $$;
