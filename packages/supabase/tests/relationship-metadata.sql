-- PostgREST discovers relationships from real foreign-key metadata. Parallel
-- single/composite FKs make embeds ambiguous, even when SQL writes are safe.
with expected(child,column_name,constraint_name,delete_action) as (values
 ('products','category_id','products_category_id_fkey','n'),
 ('product_variants','product_id','product_variants_product_id_fkey','c'),
 ('product_variants','supplier_id','product_variants_supplier_id_fkey','n'),
 ('cash_registers','opened_by','cash_registers_opened_by_fkey','a'),
 ('sales','cash_register_id','sales_cash_register_id_fkey','a'),
 ('sales','sold_by','sales_sold_by_fkey','a'),
 ('sales','customer_id','sales_customer_id_fkey','n'),
 ('sale_payments','sale_id','sale_payments_sale_id_fkey','c'),
 ('cash_movements','cash_register_id','cash_movements_cash_register_id_fkey','c'),
 ('cash_movements','performed_by','cash_movements_performed_by_fkey','a'),
 ('stock_movements','variant_id','stock_movements_variant_id_fkey','c'),
 ('stock_movements','performed_by','stock_movements_performed_by_fkey','n'),
 ('purchase_orders','supplier_id','purchase_orders_supplier_id_fkey','r'),
 ('purchase_orders','created_by','purchase_orders_created_by_fkey','n')
)
select test.ok('single discoverable tenant relationship '||e.child||'.'||e.column_name,
 count(c.oid)=1 and bool_and(c.conname=e.constraint_name and cardinality(c.conkey)=2
  and c.confdeltype::text=e.delete_action
  and (e.delete_action<>'n' or c.confdelsetcols=array[a.attnum])))
from expected e
join pg_attribute a on a.attrelid=('public.'||e.child)::regclass and a.attname=e.column_name
left join pg_constraint c on c.conrelid=a.attrelid and c.contype='f' and a.attnum=any(c.conkey)
group by e.child,e.column_name;
-- Check actual cascade and column-specific nulling preserve tenant identities.
do $$declare category uuid; product uuid; variant uuid; supplier uuid; customer uuid; tenant uuid:='20000000-0000-0000-0000-000000000001'; begin
 begin
  insert into categories(store_id,name) values(tenant,'Delete semantics') returning id into category;
  insert into products(store_id,category_id,name) values(tenant,category,'Delete semantics') returning id into product;
  insert into suppliers(store_id,name) values(tenant,'Delete semantics') returning id into supplier;
  insert into product_variants(store_id,product_id,supplier_id) values(tenant,product,supplier) returning id into variant;
  perform test.rejects('category deletion honors linked-product guard',format('delete from categories where id=%L',category));
  delete from suppliers where id=supplier;
  perform test.ok('supplier deletion nulls supplier only',exists(select 1 from product_variants where id=variant and supplier_id is null and store_id=tenant));
  delete from products where id=product;
  perform test.ok('product deletion cascades variants',not exists(select 1 from product_variants where id=variant));
  delete from categories where id=category;
  insert into customers(store_id,full_name) values(tenant,'Delete semantics') returning id into customer;
  update sales set customer_id=customer where id='70000000-0000-0000-0000-000000000001';
  delete from customers where id=customer;
  perform test.ok('customer deletion nulls customer only',exists(select 1 from sales where id='70000000-0000-0000-0000-000000000001' and customer_id is null and store_id=tenant));
 exception when others then
  insert into test.results values('foreign key deletion behavior',false,SQLERRM);
  raise notice 'FAIL foreign key deletion behavior: %',SQLERRM;
 end;
end $$;
do $$begin if exists(select 1 from test.results where not passed) then raise exception 'relationship metadata regression'; end if; end $$;
