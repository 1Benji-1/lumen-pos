-- Terminal detail edits must fail without mutating fixtures, including RED runs.
create function test.blocks_order_item_write(name text,statement text) returns void language plpgsql as $$
declare denied boolean:=false;
begin
 begin
  execute statement;
  raise exception 'Write unexpectedly succeeded' using errcode='Z0001';
 exception
  when sqlstate 'Z0001' then denied:=false;
  when others then denied:=SQLSTATE in ('42501','55000','55P03');
 end;
 perform test.ok(name,denied);
end $$;
grant execute on function test.blocks_order_item_write(text,text) to authenticated;
insert into purchase_orders(id,store_id,supplier_id,order_number,status) values
 ('90000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000002','TERMINAL-DETAIL','pending'),
 ('90000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000002','CANCELLED-DETAIL','pending'),
 ('90000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000002','DELETE-PENDING','pending');
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
insert into purchase_order_items(id,purchase_order_id,variant_id,quantity,cost_price,subtotal) values
 ('a0000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',10,5,50);
update purchase_order_items set quantity=20,subtotal=100 where id='a0000000-0000-0000-0000-000000000001';
select test.ok('pending order item INSERT and UPDATE work',exists(select 1 from purchase_order_items where id='a0000000-0000-0000-0000-000000000001' and quantity=20));
insert into purchase_order_items(id,purchase_order_id,variant_id,quantity,cost_price,subtotal) values
 ('a0000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',1,5,5);
delete from purchase_order_items where id='a0000000-0000-0000-0000-000000000002';
select test.ok('pending order item DELETE works',not exists(select 1 from purchase_order_items where id='a0000000-0000-0000-0000-000000000002'));
select receive_purchase_order('90000000-0000-0000-0000-000000000003');
select test.blocks_order_item_write('received item quantity cannot change 20 to 100', $$update purchase_order_items set quantity=100,subtotal=500 where id='a0000000-0000-0000-0000-000000000001'$$);
select test.blocks_order_item_write('received order cannot INSERT detail', $$insert into purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal) values('90000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',1,5,5)$$);
select test.blocks_order_item_write('received order cannot DELETE detail', $$delete from purchase_order_items where id='a0000000-0000-0000-0000-000000000001'$$);
insert into purchase_order_items(id,purchase_order_id,variant_id,quantity,cost_price,subtotal) values
 ('a0000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001',1,5,5);
update purchase_orders set status='cancelled' where id='90000000-0000-0000-0000-000000000004';
select test.blocks_order_item_write('cancelled order cannot UPDATE detail', $$update purchase_order_items set cost_price=99 where id='a0000000-0000-0000-0000-000000000003'$$);
select test.blocks_order_item_write('cancelled order cannot INSERT detail', $$insert into purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal) values('90000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001',1,5,5)$$);
select test.blocks_order_item_write('cancelled order cannot DELETE detail', $$delete from purchase_order_items where id='a0000000-0000-0000-0000-000000000003'$$);
-- Both old and new parents are checked when moving a pending line.
insert into purchase_order_items(id,purchase_order_id,variant_id,quantity,cost_price,subtotal) values
 ('a0000000-0000-0000-0000-000000000004','90000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000001',1,5,5);
select test.blocks_order_item_write('pending item cannot move into final order', $$update purchase_order_items set purchase_order_id='90000000-0000-0000-0000-000000000003' where id='a0000000-0000-0000-0000-000000000004'$$);
select test.blocks_order_item_write('received parent deletion cannot bypass detail guard', $$delete from purchase_orders where id='90000000-0000-0000-0000-000000000003'$$);
delete from purchase_orders where id='90000000-0000-0000-0000-000000000005';
select test.ok('pending parent deletion retains item cascade',not exists(select 1 from purchase_order_items where id='a0000000-0000-0000-0000-000000000004'));
reset role;
set role service_role;
delete from purchase_orders where id in ('90000000-0000-0000-0000-000000000003','90000000-0000-0000-0000-000000000004');
reset role;
select test.ok('service role can clean terminal fixtures with cascade',not exists(select 1 from purchase_order_items where id in ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003')));
do $$begin if exists(select 1 from test.results where not passed) then raise exception 'terminal purchase order item regression'; end if; end $$;
