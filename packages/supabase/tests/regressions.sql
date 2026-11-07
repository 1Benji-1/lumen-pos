\set ON_ERROR_STOP on
create schema test;
create table test.results (name text, passed boolean, detail text);
create function test.ok(name text, passed boolean) returns void language plpgsql as $$
begin
 insert into test.results values (name, coalesce(passed,false), null);
 raise notice '%: %', case when coalesce(passed,false) then 'PASS' else 'FAIL' end, name;
end $$;
create function test.rejects(name text, statement text) returns void language plpgsql as $$
begin
 begin
  execute statement;
 exception when others then
  insert into test.results values (name, SQLSTATE not in ('42703','42883','23502'), SQLSTATE || ': ' || SQLERRM);
  raise notice '%: % (%)', case when SQLSTATE in ('42703','42883','23502') then 'FAIL' else 'PASS' end, name, SQLERRM;
  return;
 end;
 perform test.ok(name, false);
end $$;
create function test.sale(p_key text default null, p_quantity numeric default 1, p_price numeric default 10, p_discount numeric default 0, p_register uuid default '30000000-0000-0000-0000-000000000001', p_at timestamptz default null) returns uuid language plpgsql as $$
declare sale uuid;
begin
 if p_key is null and p_at is null then
  select public.create_sale(p_register,'cash',jsonb_build_array(jsonb_build_object('product_variant_id','50000000-0000-0000-0000-000000000001','quantity',p_quantity,'unit_price',p_price,'discount',p_discount))) into sale;
 else
  execute 'select public.create_sale($1,$2,$3,p_idempotency_key=>$4,p_created_at=>$5)' into sale using p_register,'cash',jsonb_build_array(jsonb_build_object('product_variant_id','50000000-0000-0000-0000-000000000001','quantity',p_quantity,'unit_price',p_price,'discount',p_discount)),p_key,p_at;
 end if;
 return sale;
end $$;
grant usage on schema test to authenticated, anon, service_role;
grant all on all tables in schema test to authenticated, anon, service_role;
grant execute on all functions in schema test to authenticated, anon, service_role;
insert into auth.users(id,email) select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'user'||n||'@test.invalid' from generate_series(1,8)n;
insert into public.stores(id,name,owner_id,plan_id) values
 ('20000000-0000-0000-0000-000000000001','A','10000000-0000-0000-0000-000000000001',(select id from plans where code='enterprise')),
 ('20000000-0000-0000-0000-000000000002','B','10000000-0000-0000-0000-000000000002',(select id from plans where code='standard'));
insert into public.users(id,store_id,role,is_active) values
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','owner',true),
 ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','owner',true),
 ('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','cashier',true),
 ('10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','cashier',false),
 ('10000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','admin',true),
 ('10000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001','stock_clerk',true);
insert into public.cash_registers(id,store_id,opened_by,opened_at) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',now()-interval '3 hours'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002',now()-interval '3 hours');
insert into public.products(id,store_id,name) values
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Product A'),
 ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Product B');
insert into public.product_variants(id,store_id,product_id,cost_price,sale_price,stock_quantity) values
 ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',4,10,100),
 ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',4,10,100);
update public.store_settings set allow_negative_stock=false;
insert into public.customers(id,store_id,full_name,phone) values
 ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Secret B','123');
-- Isolated statement blocks preserve state on rejected writes.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('cashier cannot elevate own role', $$update public.users set role='owner' where id=auth.uid()$$);
reset role;
update users set role='cashier',store_id='20000000-0000-0000-0000-000000000001' where id='10000000-0000-0000-0000-000000000003';
set role authenticated;
select test.rejects('cashier cannot change own tenant', $$update public.users set store_id='20000000-0000-0000-0000-000000000002' where id=auth.uid()$$);
reset role;
update users set store_id='20000000-0000-0000-0000-000000000001' where id='10000000-0000-0000-0000-000000000003';
set role authenticated;
select test.rejects('cashier cannot override subscription', $$update public.stores set feature_overrides='{"split_payments":true}',subscription_status='active' where id='20000000-0000-0000-0000-000000000001'$$);
select test.rejects('cashier cannot modify inventory', $$update product_variants set sale_price=1 where id='50000000-0000-0000-0000-000000000001'$$);
select test.rejects('tenant cannot read admin overview', $$select public.get_admin_stores_overview()$$);
select test.rejects('tenant cannot probe another customer', $$select * from public.check_duplicate_customer('20000000-0000-0000-0000-000000000002','123')$$);
reset role;
update stores set subscription_status='trialing',feature_overrides='{}';
update product_variants set sale_price=10;
set role anon;
select set_config('request.jwt.claim.sub','',false);
select test.rejects('anonymous cannot probe customer', $$select * from public.check_duplicate_customer('20000000-0000-0000-0000-000000000002','123')$$);
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select test.ok('inactive user cannot read tenant products',(select count(*)=0 from products));
select test.rejects('inactive user cannot create sale', $$select test.sale()$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',false);
select test.rejects('admin cannot assign owner', $$update users set role='owner' where id='10000000-0000-0000-0000-000000000006'$$);
reset role;
update users set role='stock_clerk' where id='10000000-0000-0000-0000-000000000006';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);

select test.rejects('variant product cannot cross tenant', $$insert into product_variants(store_id,product_id) values('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('sale rejects zero quantity', $$select test.sale(null,0)$$);
select test.rejects('sale rejects negative price', $$select test.sale(null,1,-1)$$);
select test.rejects('sale rejects negative discount', $$select test.sale(null,1,10,-1)$$);
select test.rejects('sale rejects excessive discount', $$select test.sale(null,1,10,11)$$);
select test.rejects('sale rejects empty cart', $$select create_sale('30000000-0000-0000-0000-000000000001','cash','[]')$$);
select test.rejects('sale rejects cross tenant customer', $$select create_sale('30000000-0000-0000-0000-000000000001','cash','[{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":1,"unit_price":10}]','60000000-0000-0000-0000-000000000002')$$);
-- Catch a broken valid sale too, so baseline records all security and money regressions.
do $$declare s uuid; begin
 begin
  s:=test.sale('offline-test-1',2,10,2);
  perform test.ok('sale preserves seller subtotal discounts',exists(select 1 from sales where id=s and sold_by=auth.uid() and subtotal=18 and total=18));
  perform test.ok('sale preserves historical cost discount',exists(select 1 from sale_items where sale_id=s and cost_price=4 and discount=2 and subtotal=18));
  perform test.ok('simple sale records tenant payment',exists(select 1 from sale_payments where sale_id=s and store_id=public.get_my_store_id() and amount=18 and payment_method='cash'));
  perform test.ok('sale idempotent retry',test.sale('offline-test-1',2,10,2)=s);
 exception when others then
  insert into test.results values('valid idempotent sale succeeds',false,SQLERRM); raise notice 'FAIL valid sale: %',SQLERRM;
 end;
end $$;
reset role;
update cash_registers set status='closed',closed_at=now() where id='30000000-0000-0000-0000-000000000001';
set role authenticated;
select test.rejects('normal sale rejects closed register', $$select test.sale()$$);
do $$declare s uuid; begin
 begin
  s:=test.sale('offline-closed',1,10,0,'30000000-0000-0000-0000-000000000001',now()-interval '1 hour');
  perform test.ok('offline sale accepts own historical register',s is not null);
 exception when others then
  insert into test.results values('offline sale accepts own historical register',false,SQLERRM); raise notice 'FAIL historical sale: %',SQLERRM;
 end;
end $$;
reset role;
update cash_registers set status='open',closed_at=null where id='30000000-0000-0000-0000-000000000001';
-- Verify refunds and analytics with known ledger fixtures independent of create_sale.
insert into sales(id,store_id,cash_register_id,sold_by,payment_method,total,subtotal,created_at) values
 ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','split',10,10,'2026-10-01T02:00:00Z'),
 ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','cash',20,20,'2026-10-01T02:00:00Z');
insert into sale_items(sale_id,product_variant_id,quantity,unit_price,subtotal,cost_price) values
 ('70000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',2,10,20,4);
insert into sale_payments(sale_id,store_id,payment_method,amount) values
 ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','cash',4),
 ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','card',6),
 ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','cash',20);
set role authenticated;
select test.rejects('cashier cannot refund', $$select refund_sale('70000000-0000-0000-0000-000000000002',null,null)$$);
reset role;
-- Restore a baseline refund that broad cashier RPC may have applied.
update sales set status='completed' where id='70000000-0000-0000-0000-000000000002';
delete from cash_movements;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select refund_sale('70000000-0000-0000-0000-000000000002','test',null);
select test.rejects('second refund rejected', $$select refund_sale('70000000-0000-0000-0000-000000000002','twice',null)$$);
select test.ok('refund has single cash withdrawal',(select count(*)=1 from cash_movements where amount=20));
select test.ok('analytics excludes refunded sales', (get_store_analytics('2026-09-30','2026-10-02')->'summary'->>'total_sales')::numeric=10);
select test.ok('analytics counts split cash',(get_store_analytics('2026-09-30','2026-10-02')->'summary'->>'cash_sales')::numeric=4);
select test.ok('analytics uses store timezone',get_store_analytics('2026-09-30','2026-10-02')->'daily_sales'->0->>'date'='2026-09-30');
reset role;
-- Direct FK and protected-operation probes as owner.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.rejects('cannot forge tenant payment', $$insert into sale_payments(sale_id,store_id,payment_method,amount) values('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','cash',5)$$);
select test.rejects('cannot reassign cash register opener', $$update cash_registers set opened_by='10000000-0000-0000-0000-000000000001' where id='30000000-0000-0000-0000-000000000001'$$);
select test.rejects('owner cannot override subscription', $$update stores set grace_period_days=999 where id='20000000-0000-0000-0000-000000000001'$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',false);
select test.rejects('stock clerk cannot sell', $$select test.sale()$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.rejects('standard plan blocks analytics RPC', $$select get_store_analytics(now()-interval '1 day',now())$$);
select test.rejects('standard plan blocks second open register', $$insert into cash_registers(store_id,opened_by) values('20000000-0000-0000-0000-000000000002',auth.uid())$$);
reset role;
-- Authorized writes must work too: rejection probes must not hide schema errors.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
do $$declare p uuid; v uuid; begin
 begin
  insert into products(store_id,name) values(public.get_my_store_id(),'authorized product') returning id into p;
  insert into product_variants(store_id,product_id,sale_price) values(public.get_my_store_id(),p,2) returning id into v;
  update product_variants set sale_price=3 where id=v;
  perform test.ok('owner inventory writes work',exists(select 1 from product_variants where id=v and sale_price=3));
  delete from product_variants where id=v;
  delete from products where id=p;
 exception when others then insert into test.results values('owner inventory writes work',false,SQLERRM); end;
end $$;
select test.rejects('owner cannot access another cashier idempotency key', $$select test.sale('offline-test-1')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('split payment requires details', $$select create_sale('30000000-0000-0000-0000-000000000001','split','[{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":1,"unit_price":10}]')$$);
select test.rejects('payments cannot differ by a cent', $$select create_sale('30000000-0000-0000-0000-000000000001','cash','[{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":1,"unit_price":10}]',p_payments=>'[{"payment_method":"cash","amount":9.99}]')$$);
select test.rejects('duplicate variant lines cannot oversell', $$select create_sale('30000000-0000-0000-0000-000000000001','cash','[{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":60,"unit_price":10},{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":60,"unit_price":10}]')$$);
select test.rejects('NaN quantity rejected', $$select test.sale(null,'NaN'::numeric)$$);
select test.rejects('unit quantities cannot be fractional', $$select test.sale(null,0.1)$$);
select test.rejects('future sale rejected', $$select test.sale('future',1,10,0,'30000000-0000-0000-0000-000000000001',now()+interval '1 day')$$);
select test.rejects('cashier cannot use another store register', $$select test.sale('other-register',1,10,0,'30000000-0000-0000-0000-000000000002')$$);
reset role;
update stores set subscription_status='suspended' where id='20000000-0000-0000-0000-000000000001';
set role authenticated;
select test.rejects('suspended store cannot sell', $$select test.sale()$$);
reset role;
update stores set subscription_status='trialing' where id='20000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.rejects('standard plan blocks split sales', $$select create_sale('30000000-0000-0000-0000-000000000002','split','[{"product_variant_id":"50000000-0000-0000-0000-000000000002","quantity":1,"unit_price":10}]',p_payments=>'[{"payment_method":"cash","amount":5},{"payment_method":"card","amount":5}]')$$);
insert into users(id,store_id,role) values('10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002','cashier');
select test.rejects('user limit enforced in database', $$insert into users(id,store_id,role) values('10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','cashier')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select test.rejects('inactive user cannot submit feedback', $$insert into app_feedback(store_id,user_id,type,title,description) values('20000000-0000-0000-0000-000000000001',auth.uid(),'issue','x','x')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('feedback tenant cannot be forged', $$insert into app_feedback(store_id,user_id,type,title,description) values('20000000-0000-0000-0000-000000000002',auth.uid(),'issue','x','x')$$);
reset role;
-- Public contract and authorized operations.
set role service_role;
select test.rejects('service role cannot bypass active user limit', $$insert into users(id,store_id,role) values('10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','cashier')$$);
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
do $$declare a uuid; b uuid; begin
 begin
  a:=test.sale();
  b:=public.create_sale('30000000-0000-0000-0000-000000000001','split',
   '[{"product_variant_id":"50000000-0000-0000-0000-000000000001","quantity":2,"unit_price":10,"discount":2}]',
   p_discount=>3,p_payments=>'[{"payment_method":"cash","amount":5},{"payment_method":"card","amount":10}]',p_customer_email=>'receipt@test.invalid');
  perform test.ok('legacy seven argument sale contract still works',a is not null);
  perform test.ok('split and global discounts preserve ledger',exists(select 1 from sales where id=b and subtotal=18 and discount=3 and total=15 and customer_email='receipt@test.invalid') and (select sum(amount)=15 and count(*)=2 from sale_payments where sale_id=b));
 exception when others then insert into test.results values('authorized sales contract',false,SQLERRM); end;
end $$;
insert into customers(store_id,full_name,phone) values(public.get_my_store_id(),'Own Customer','own-123');
select test.ok('own duplicate customer lookup works',(select count(*)=1 from check_duplicate_customer(public.get_my_store_id(),'own-123')));
insert into app_feedback(store_id,user_id,type,title,description) values(public.get_my_store_id(),auth.uid(),'idea','Authorized','Feedback');
select test.ok('active user feedback works',exists(select 1 from app_feedback where title='Authorized'));
reset role;
update stores set subscription_status='active',subscription_ends_at=now()-interval '6 days' where id='20000000-0000-0000-0000-000000000001';
set role authenticated;
select test.rejects('expired subscription beyond grace cannot sell', $$select test.sale()$$);
reset role;
update stores set subscription_status='trialing',subscription_ends_at=null where id='20000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claims','{"app_metadata":{"is_super_admin":true}}',false);
select test.ok('server superadmin claim permits overview',jsonb_array_length(get_admin_stores_overview())=2);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',false);
select test.ok('inactive profile cannot use superadmin claim',not is_super_admin());
select set_config('request.jwt.claims','{}',false);
reset role;
-- Terminal purchase orders cannot be reopened and received a second time.
insert into suppliers(id,store_id,name) values('80000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Terminal supplier');
insert into purchase_orders(id,store_id,supplier_id,order_number,status) values('90000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000002','TERMINAL','pending');
insert into purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal) values('90000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',1,4,4);
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select test.ok('purchase receipt succeeds once',receive_purchase_order('90000000-0000-0000-0000-000000000002'));
select test.rejects('received order cannot return to pending', $$update purchase_orders set status='pending' where id='90000000-0000-0000-0000-000000000002'$$);
select test.rejects('order cannot be inserted already received', $$insert into purchase_orders(store_id,supplier_id,order_number,status) values(public.get_my_store_id(),'80000000-0000-0000-0000-000000000002','FORGED','received')$$);
-- Product creation must create its initial ledger entry in the same transaction.
do $$declare result jsonb; variant uuid; begin
 begin
  execute 'select public.create_product_with_variant($1,$2)' into result using
   '{"name":"Atomic product","store_id":"20000000-0000-0000-0000-000000000002"}'::jsonb,
   '{"name":"Initial","cost_price":2,"sale_price":5,"stock_quantity":5,"unit":"unit"}'::jsonb;
  variant:=(result->'variant'->>'id')::uuid;
  perform test.ok('atomic product RPC returns both rows',result->'product'->>'name'='Atomic product' and result->'variant'->>'name'='Initial');
  perform test.ok('atomic product tenant derived from actor',result->'product'->>'store_id'=public.get_my_store_id()::text and result->'variant'->>'store_id'=public.get_my_store_id()::text);
  perform test.ok('atomic product has initial stock audit',exists(select 1 from stock_movements where variant_id=variant and quantity_change=5 and previous_stock=0 and new_stock=5 and performed_by=auth.uid()));
 exception when others then insert into test.results values('atomic product creation succeeds',false,SQLERRM); raise notice 'FAIL atomic product: %',SQLERRM; end;
end $$;
select test.rejects('invalid initial variant rejects atomic product', $$select public.create_product_with_variant('{"name":"Atomic invalid variant"}','{"cost_price":-1,"stock_quantity":1}')$$);
select test.ok('invalid initial variant leaves no orphan product',not exists(select 1 from products where name='Atomic invalid variant'));
select test.rejects('variant FK failure rolls back initial product', $$select public.create_product_with_variant('{"name":"Atomic invalid supplier"}','{"stock_quantity":1,"supplier_id":"80000000-0000-0000-0000-000000000099"}')$$);
select test.ok('variant FK failure leaves no orphan product',not exists(select 1 from products where name='Atomic invalid supplier'));
select test.rejects('fractional initial whole unit stock rejected', $$select public.create_product_with_variant('{"name":"Atomic invalid units"}','{"stock_quantity":1.2,"unit":"unit"}')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
select test.rejects('cashier cannot use atomic inventory RPC', $$select public.create_product_with_variant('{"name":"Forged cashier"}','{}')$$);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
select test.rejects('atomic inventory RPC enforces batch plan', $$select public.create_product_with_variant('{"name":"Forged batch"}','{"track_batch":true}')$$);
reset role;
-- Optional MFA enrollment: only verified factors require elevated assurance.
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claims','{"app_metadata":{"is_super_admin":true},"aal":"aal1"}',false);
select test.ok('superadmin without MFA remains allowed',is_super_admin());
reset role;
insert into auth.mfa_factors(user_id,status) values('10000000-0000-0000-0000-000000000001','unverified');
set role authenticated;
select test.ok('unverified MFA enrollment does not require AAL2',is_super_admin());
reset role;
insert into auth.mfa_factors(user_id,status) values('10000000-0000-0000-0000-000000000001','verified');
set role authenticated;
select test.ok('verified MFA rejects superadmin AAL1',not is_super_admin());
select test.rejects('verified MFA AAL1 cannot call admin RPC', $$select public.get_admin_stores_overview()$$);
select test.ok('verified MFA AAL1 cannot read other tenant via admin policy',not exists(select 1 from stores where id='20000000-0000-0000-0000-000000000002'));
select test.rejects('MFA factor table remains private', $$select * from auth.mfa_factors$$);
select set_config('request.jwt.claims','{"app_metadata":{"is_super_admin":true},"aal":"aal2"}',false);
select test.ok('verified MFA permits superadmin AAL2',is_super_admin() and jsonb_array_length(get_admin_stores_overview())=2);
select set_config('request.jwt.claims','{"app_metadata":{"is_super_admin":false},"aal":"aal2"}',false);
select test.ok('AAL2 alone does not grant superadmin',not is_super_admin());
select set_config('request.jwt.claims','{}',false);
reset role;
delete from auth.mfa_factors;
table test.results;
do $$declare failures integer; begin select count(*) into failures from test.results where not passed; if failures>0 then raise exception '% behavioral regressions failed',failures; end if; end $$;
