-- Applied by the test runner immediately before the organization-area migration.
insert into auth.users(id,email) values ('10000000-0000-0000-0000-000000000090','area-legacy-health@test.invalid');
insert into public.stores(id,name,owner_id,plan_id)
values ('20000000-0000-0000-0000-000000000090','Consultorio anterior','10000000-0000-0000-0000-000000000090',
  (select id from public.plans where code='enterprise'));
update public.branches set category_id='consultorios_clinicas'
where store_id='20000000-0000-0000-0000-000000000090' and is_primary;
insert into public.users(id,store_id,role,is_active)
values ('10000000-0000-0000-0000-000000000090','20000000-0000-0000-0000-000000000090','owner',true);
