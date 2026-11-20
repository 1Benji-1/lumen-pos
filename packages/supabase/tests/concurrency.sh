#!/usr/bin/env bash
set -euo pipefail
container="$1"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
sql() { docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres; }
# Deliberately slow a stock write: without row locks both workers read the old
# business status before either updates it. The fix must serialize before that read.
sql <<'SQL'
create function test.slow_stock_write() returns trigger language plpgsql as $$
begin perform pg_sleep(0.3); return new; end $$;
create trigger test_slow_stock before update on product_variants for each row execute function test.slow_stock_write();
insert into suppliers(id,store_id,name) values('80000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','supplier');
insert into purchase_orders(id,store_id,supplier_id,order_number,status) values('90000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','CONCURRENT','pending');
insert into purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal) values('90000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',5,4,20);
update product_variants set stock_quantity=10 where id='50000000-0000-0000-0000-000000000001';
SQL
worker() {
 local identity="$1" statement="$2" output="$3"
 { printf "set role authenticated;\nselect set_config('request.jwt.claim.sub','%s',false);\n" "$identity"; printf '%s;\n' "$statement"; } | sql >"$output" 2>&1
}
pair() {
 local identity="$1" first="$2" second="$3"
 worker "$identity" "$first" "$tmpdir/first" & local p1=$!
 worker "$identity" "$second" "$tmpdir/second" & local p2=$!
 wait "$p1" || true
 wait "$p2" || true
}
assert_sql() { printf 'select test.ok(%s);\n' "$1" | sql; }
sql <<'SQL'
delete from users where id in ('10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000008');
SQL
pair '10000000-0000-0000-0000-000000000002' "insert into users(id,store_id,role) values('10000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002','cashier')" "insert into users(id,store_id,role) values('10000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002','cashier')"
assert_sql "'concurrent staff creation respects plan limit',(select count(*)=2 from users where store_id='20000000-0000-0000-0000-000000000002' and is_active)"
sql <<'SQL'
update cash_registers set status='closed',closed_at=now(),closing_amount=0 where id='30000000-0000-0000-0000-000000000002';
SQL
pair '10000000-0000-0000-0000-000000000002' "insert into cash_registers(store_id,opened_by) values('20000000-0000-0000-0000-000000000002',auth.uid())" "insert into cash_registers(store_id,opened_by) values('20000000-0000-0000-0000-000000000002',auth.uid())"
assert_sql "'concurrent register opening respects plan limit',(select count(*)=1 from cash_registers where store_id='20000000-0000-0000-0000-000000000002' and status='open')"
pair '10000000-0000-0000-0000-000000000001' "select receive_purchase_order('90000000-0000-0000-0000-000000000001')" "select receive_purchase_order('90000000-0000-0000-0000-000000000001')"
assert_sql "'concurrent purchase order received once',(select stock_quantity=15 from product_variants where id='50000000-0000-0000-0000-000000000001')"
sql <<'SQL'
update product_variants set stock_quantity=14 where id='50000000-0000-0000-0000-000000000001';
insert into sales(id,store_id,cash_register_id,sold_by,payment_method,total,subtotal) values('70000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','cash',10,10);
insert into sale_items(sale_id,product_variant_id,quantity,unit_price,subtotal) values('70000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',1,10,10);
insert into sale_payments(sale_id,store_id,payment_method,amount) values('70000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','cash',10);
SQL
pair '10000000-0000-0000-0000-000000000001' "select refund_sale('70000000-0000-0000-0000-000000000003','race',null)" "select refund_sale('70000000-0000-0000-0000-000000000003','race',null)"
assert_sql "'concurrent refund restocks once',(select stock_quantity=15 from product_variants where id='50000000-0000-0000-0000-000000000001')"
assert_sql "'concurrent refund withdraws cash once',(select count(*)=1 from cash_movements where reason like '%70000000-0000-0000-0000-000000000003%')"
sql <<'SQL'
update product_variants set stock_quantity=15 where id='50000000-0000-0000-0000-000000000001';
SQL
pair '10000000-0000-0000-0000-000000000003' "select test.sale('concurrent-same-key')" "select test.sale('concurrent-same-key')"
assert_sql "'concurrent idempotency creates one sale',(select count(*)=1 from sales s where to_jsonb(s)->>'idempotency_key'='concurrent-same-key')"
assert_sql "'concurrent idempotency decrements once',(select stock_quantity=14 from product_variants where id='50000000-0000-0000-0000-000000000001')"
sql <<'SQL'
update product_variants set stock_quantity=10 where id='50000000-0000-0000-0000-000000000001';
SQL
pair '10000000-0000-0000-0000-000000000003' "select test.sale('concurrent-stock-a',10)" "select test.sale('concurrent-stock-b',10)"
assert_sql "'concurrent sales cannot oversell',(select stock_quantity=0 from product_variants where id='50000000-0000-0000-0000-000000000001') and (select count(*)=1 from sales s where to_jsonb(s)->>'idempotency_key' in ('concurrent-stock-a','concurrent-stock-b'))"
sql <<'SQL'
insert into purchase_orders(id,store_id,supplier_id,order_number,status) values('90000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001','PARENT-LOCK','pending');
SQL
worker '10000000-0000-0000-0000-000000000001' "set application_name='lumen-order-lock-holder'; begin; select id from purchase_orders where id='90000000-0000-0000-0000-000000000006' for update; select pg_sleep(2); commit" "$tmpdir/order-lock" & holder_pid=$!
lock_ready=false
for attempt in {1..30}; do
 if [[ "$(sql <<'SQL'
select exists(select 1 from pg_stat_activity where application_name='lumen-order-lock-holder' and wait_event='PgSleep');
SQL
)" == t ]]; then lock_ready=true; break; fi
 sleep 0.02
done
if [[ "$lock_ready" != true ]]; then cat "$tmpdir/order-lock"; wait "$holder_pid" || true; exit 1; fi
worker '10000000-0000-0000-0000-000000000001' "select test.blocks_order_item_write('concurrent receipt parent lock rejects detail mutation', \$\$insert into purchase_order_items(purchase_order_id,variant_id,quantity,cost_price,subtotal) values('90000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001',1,5,5)\$\$)" "$tmpdir/order-edit"
cat "$tmpdir/order-edit"
wait "$holder_pid"
sql <<'SQL'
do $$begin if exists(select 1 from test.results where not passed) then raise exception 'concurrency regression'; end if; end $$;
SQL
