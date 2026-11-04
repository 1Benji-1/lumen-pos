import { MODULE_REGISTRY } from '../packages/types/src/modules.ts'

const expected = Object.values(MODULE_REGISTRY).map(module => ({
  id: module.id,
  scope: module.scope,
  implementation_status: module.implementationStatus,
  required_feature: module.requiredFeature ?? null,
}))
const sqlLiteral = JSON.stringify(expected).replaceAll("'", "''")

process.stdout.write(`
with expected as (
  select * from jsonb_to_recordset('${sqlLiteral}'::jsonb)
    as row(id text, scope text, implementation_status text, required_feature text)
)
select test.ok('module catalog matches TypeScript registry', not exists (
  select 1 from expected e full join public.module_catalog c on c.id=e.id
  where e.id is null or c.id is null
    or e.scope is distinct from c.scope
    or e.implementation_status is distinct from c.implementation_status
    or e.required_feature is distinct from c.required_feature
));
do $$begin
  if exists(select 1 from test.results where not passed) then
    raise exception 'module catalog drift';
  end if;
end $$;
`)
