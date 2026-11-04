-- Primary branches preserve the existing store tenant and legacy category edits.
select test.ok('existing store A has one primary branch',
  (select count(*)=1 from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary));
select test.ok('existing store B has one primary branch',
  (select count(*)=1 from public.branches where store_id='20000000-0000-0000-0000-000000000002' and is_primary));
select test.ok('backfill keeps store name and retail category',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000001'
    and name='A' and category_id='comercio_general' and is_primary));

update public.stores set business_type='restaurante' where id='20000000-0000-0000-0000-000000000001';
select test.ok('restaurant legacy type maps to traditional restaurant',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary and category_id='restaurante_tradicional'));
update public.stores set business_type='supermercado' where id='20000000-0000-0000-0000-000000000001';
select test.ok('supermarket legacy type maps to minimarket',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary and category_id='minimarket_abarrotes'));
update public.stores set business_type='tienda_articulos',industry_sub_type='ropa_calzado' where id='20000000-0000-0000-0000-000000000001';
select test.ok('retail subtype maps to its own category',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000001' and is_primary and category_id='ropa_calzado'));

insert into public.stores(id,name,owner_id,plan_id) values
 ('20000000-0000-0000-0000-000000000003','C','10000000-0000-0000-0000-000000000001',(select id from public.plans where code='standard'));
select test.ok('new stores receive a primary branch',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000003' and name='C' and category_id='comercio_general' and is_primary));
select test.rejects('second primary branch is rejected',
  $$insert into public.branches(store_id,name,category_id,is_primary) values
    ('20000000-0000-0000-0000-000000000001','Duplicate','comercio_general',true)$$);
select test.ok('branch identity includes tenant key', exists(
  select 1 from pg_constraint where conrelid='public.branches'::regclass and contype='u'
    and conkey=array[(select attnum from pg_attribute where attrelid='public.branches'::regclass and attname='id'),
                     (select attnum from pg_attribute where attrelid='public.branches'::regclass and attname='store_id')]
));

set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.ok('owner reads own branch only',
  (select count(*)=1 from public.branches where store_id='20000000-0000-0000-0000-000000000001')
  and not exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000002'));
select test.rejects('owner cannot insert a branch directly',
  $$insert into public.branches(store_id,name,category_id) values
    ('20000000-0000-0000-0000-000000000001','Forged','comercio_general')$$);
select test.rejects('owner cannot update a branch directly',
  $$update public.branches set name='Forged' where store_id='20000000-0000-0000-0000-000000000001'$$);
select test.rejects('owner cannot delete a branch directly',
  $$delete from public.branches where store_id='20000000-0000-0000-0000-000000000001'$$);
update public.stores set name='A renewed',business_type='tienda_articulos',industry_sub_type='ferreteria_construccion'
where id='20000000-0000-0000-0000-000000000001';
select test.ok('owner legacy edits synchronize the primary branch',
  exists(select 1 from public.branches where store_id='20000000-0000-0000-0000-000000000001'
    and is_primary and name='A renewed' and category_id='ferreteria_construccion'));
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select test.ok('inactive profile cannot read branches',(select count(*)=0 from public.branches));
reset role;

do $$begin if exists(select 1 from test.results where not passed) then raise exception 'primary branch regression'; end if; end $$;
