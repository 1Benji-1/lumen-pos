import { CATEGORY_MODULE_DEFAULTS, MODULE_REGISTRY } from '../packages/types/src/modules.ts'
import { ROLE_DEFINITIONS } from '../packages/types/src/staff.ts'

const expected = Object.values(MODULE_REGISTRY).map(module => ({
  id: module.id,
  scope: module.scope,
  implementation_status: module.implementationStatus,
  required_feature: module.requiredFeature ?? null,
}))
const sqlLiteral = JSON.stringify(expected).replaceAll("'", "''")
const categoryDefaults = Object.entries(CATEGORY_MODULE_DEFAULTS)
  .flatMap(([category_id, modules]) => modules.map(module_id => ({ category_id, module_id })))
const rolePermissions = Object.entries(ROLE_DEFINITIONS)
  .flatMap(([role, definition]) => definition.permissions.map(permission => ({ role, permission })))
const categoryLiteral = JSON.stringify(categoryDefaults).replaceAll("'", "''")
const roleLiteral = JSON.stringify(rolePermissions).replaceAll("'", "''")

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
with expected as (
  select * from jsonb_to_recordset('${categoryLiteral}'::jsonb)
    as row(category_id text,module_id text)
)
select test.ok('category defaults match TypeScript registry', not exists (
  select category_id,module_id from expected
  except select category_id,module_id from public.category_module_defaults
) and not exists (
  select category_id,module_id from public.category_module_defaults
  except select category_id,module_id from expected
));
with expected as (
  select * from jsonb_to_recordset('${roleLiteral}'::jsonb)
    as row(role text,permission text)
)
select test.ok('role permissions match TypeScript registry', not exists (
  select role,permission from expected
  except select role,permission from public.role_permissions
) and not exists (
  select role,permission from public.role_permissions
  except select role,permission from expected
));
do $$begin
  if exists(select 1 from test.results where not passed) then
    raise exception 'module catalog drift';
  end if;
end $$;
`)
