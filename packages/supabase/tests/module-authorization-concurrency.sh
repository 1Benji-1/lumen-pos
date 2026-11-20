#!/usr/bin/env bash
set -euo pipefail
container="$1"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
sql() { docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres; }
tenant='20000000-0000-0000-0000-000000000004'
cashier='10000000-0000-0000-0000-000000000010'
variant='50000000-0000-0000-0000-000000000004'

# Keep the authorized sale's transaction open after its module decision.
{
  printf "set application_name='lumen-module-sale-holder'; set role authenticated; select set_config('request.jwt.claim.sub','%s',false); begin;\n" "$cashier"
  printf "select test.module_sale('module-race-before'); select pg_sleep(3); commit;\n"
} | sql >"$tmpdir/sale" 2>&1 & sale_pid=$!

sale_ready=false
for attempt in {1..100}; do
  if [[ "$(sql <<'SQL'
select exists(select 1 from pg_stat_activity where application_name='lumen-module-sale-holder' and wait_event='PgSleep');
SQL
)" == t ]]; then sale_ready=true; break; fi
  sleep 0.02
done
if [[ "$sale_ready" != true ]]; then cat "$tmpdir/sale"; wait "$sale_pid" || true; exit 1; fi

{
  printf "set application_name='lumen-module-disable';\n"
  printf "insert into public.module_activations(store_id,branch_id,module_id,enabled) select store_id,id,'pos',false from public.branches where store_id='%s' and is_primary;\n" "$tenant"
} | sql >"$tmpdir/disable" 2>&1 & disable_pid=$!

disable_blocked=false
for attempt in {1..80}; do
  if [[ "$(sql <<'SQL'
select exists(select 1 from pg_stat_activity where application_name='lumen-module-disable' and wait_event_type='Lock');
SQL
)" == t ]]; then disable_blocked=true; break; fi
  if ! kill -0 "$disable_pid" 2>/dev/null; then break; fi
  sleep 0.02
done
wait "$sale_pid"
wait "$disable_pid"

if [[ "$disable_blocked" != true ]]; then
  printf 'Activation change did not wait for the authorized sale transaction.\n' >&2
  exit 1
fi

sql <<SQL
select test.ok('activation_change_serializes_with_sale',
 (select count(*)=1 from public.sales where store_id='$tenant' and idempotency_key='module-race-before')
 and (select enabled=false from public.module_activations where store_id='$tenant' and module_id='pos')
);
SQL

before="$(sql <<SQL
select (select count(*) from public.sales where store_id='$tenant'),
       (select count(*) from public.sale_payments where store_id='$tenant'),
       (select stock_quantity from public.product_variants where id='$variant');
SQL
)"
{
  printf "set role authenticated; select set_config('request.jwt.claim.sub','%s',false);\n" "$cashier"
  printf "select test.denied('sale_after_disable_denied', \$\$select test.module_sale('module-race-after')\$\$);\n"
} | sql
after="$(sql <<SQL
select (select count(*) from public.sales where store_id='$tenant'),
       (select count(*) from public.sale_payments where store_id='$tenant'),
       (select stock_quantity from public.product_variants where id='$variant');
SQL
)"
sql <<SQL
select test.ok('sale_after_disable_has_no_money_or_stock_effect', '$before'='$after');
do \$\$begin if exists(select 1 from test.results where not passed) then raise exception 'module activation race regression'; end if; end \$\$;
SQL
