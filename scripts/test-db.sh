#!/usr/bin/env bash
# Isolated PostgreSQL behavioral tests. Auth helpers below are controlled test identities,
# not an emulation/validation of Supabase Auth or its HTTP API.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container="lumen-db-test-$$-${RANDOM}"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
docker run -d --name "$container" --network none -e POSTGRES_PASSWORD=local-test-only postgres:17-alpine >/dev/null
ready=false
for attempt in {1..60}; do
  if docker exec "$container" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -U postgres'  >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.25
done
if [[ "$ready" != true ]]; then docker logs "$container"; exit 1; fi
sql() { docker exec -i "$container" psql -X -q -v ON_ERROR_STOP=1 -U postgres "$@"; }
sql < "$root/packages/supabase/tests/bootstrap.sql"
migration_stream() {
  for migration in "$root"/packages/supabase/migrations/*.sql; do
    if [[ -n "${DB_MIGRATION_CUTOFF:-}" && "$(basename "$migration")" > "$DB_MIGRATION_CUTOFF" ]]; then continue; fi
    if [[ "${DB_TEST_LEGACY_REFUND_ABSENT:-0}" == 1 && "$(basename "$migration")" == 20261102010000_stabilization.sql ]]; then
      cat "$root/packages/supabase/tests/preexisting-refund-overload-absent.sql"
      printf '\n'
    fi
    cat "$migration"
    printf '\n'
  done
}
migration_stream | sql >/dev/null
sql <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
do $$
declare relation_name text;
begin
  for relation_name in
    select tablename from pg_tables
    where schemaname='public'
      and tablename not in ('branches','module_catalog','module_activations','module_activation_audit','medical_professionals')
  loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated, service_role', relation_name);
  end loop;
  for relation_name in
    select sequencename from pg_sequences
    where schemaname='public' and sequencename<>'module_activation_audit_id_seq'
  loop
    execute format('grant usage, select on sequence public.%I to anon, authenticated, service_role', relation_name);
  end loop;
end $$;
SQL
test_status=0
sql < "$root/packages/supabase/tests/regressions.sql" || test_status=$?
sql < "$root/packages/supabase/tests/purchase-order-items-guard.sql" || test_status=$?
sql < "$root/packages/supabase/tests/relationship-metadata.sql" || test_status=$?
sql < "$root/packages/supabase/tests/primary-branches.sql" || test_status=$?
sql < "$root/packages/supabase/tests/module-activations.sql" || test_status=$?
sql < "$root/packages/supabase/tests/module-activation-ui.sql" || test_status=$?
sql < "$root/packages/supabase/tests/module-authorization.sql" || test_status=$?
sql < "$root/packages/supabase/tests/medical-profile.sql" || test_status=$?
node --experimental-strip-types "$root/scripts/module-catalog-expected.mjs" | sql || test_status=$?
bash "$root/packages/supabase/tests/concurrency.sh" "$container" || test_status=$?
# Regression probe: disable only the serialization trigger in this disposable DB.
if [[ "${DB_TEST_DISABLE_ACTIVATION_LOCK:-0}" == 1 ]]; then
  sql -c 'drop trigger lock_module_activation_before_write on public.module_activations;'
fi
bash "$root/packages/supabase/tests/module-authorization-concurrency.sh" "$container" || test_status=$?
if [[ "$test_status" != 0 ]]; then exit "$test_status"; fi
printf 'PostgreSQL behavioral tests passed (controlled Auth identities).\n'
