import { useQuery } from '@tanstack/react-query'
import { BUSINESS_CATEGORIES, BUSINESS_FAMILIES, getDefaultModuleIds, MODULE_REGISTRY, resolveEntitlements, resolveModuleAccess, resolveStoredBusinessProfile, resolveStoredModuleActivation, type AdminStoreItem } from '@lumen-pos/types'
import { getStoreModuleDetails } from '../services/adminStoreService'

export function StoreModulesTab({ store }: { store: AdminStoreItem }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-store-modules', store.id], queryFn: () => getStoreModuleDetails(store.id) })
  if (isLoading) return <p className="text-sm text-zinc-600 dark:text-zinc-400 py-8">Cargando perfil modular...</p>
  if (error || !data) return <p role="alert" className="text-sm text-rose-700 py-8">No se pudo consultar el perfil modular de esta tienda.</p>
  const profile = resolveStoredBusinessProfile(data.branch.category_id)
  if (!profile) return <p role="alert" className="text-sm text-rose-700 py-8">La sucursal tiene una categoría desconocida.</p>
  const defaults = getDefaultModuleIds(profile.categoryId)
  const entitlements = resolveEntitlements(store.plan_features, store.feature_overrides)
  const activation = resolveStoredModuleActivation(data.activations.map(row => ({ moduleId: row.module_id, branchId: row.branch_id, enabled: row.enabled })), data.branch.id)
  const relevantModules = Object.values(MODULE_REGISTRY).filter(module => defaults.includes(module.id) || activation[module.id] !== undefined)

  return <div className="space-y-5">
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-white">Sucursal principal</h2>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{data.branch.name}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{BUSINESS_FAMILIES[profile.familyId].name} · <span>{BUSINESS_CATEGORIES[profile.categoryId].name}</span></p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Los módulos activos dependen de la categoría, el plan y las decisiones del propietario.</p>
    </div>
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
      {relevantModules.map(module => {
        const access = resolveModuleAccess({ profile, moduleId: module.id, entitlements, activation })
        const status = access.reason === 'not_available_yet' ? 'Planificado'
          : access.reason === 'plan_disabled' ? 'Excluido por el plan'
          : access.reason === 'organization_disabled' ? 'Desactivado'
          : access.reason === 'category_disabled' ? 'Fuera de categoría'
          : access.allowed ? 'Activo' : 'No disponible'
        return <div key={module.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{module.name}</span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{status}</span>
        </div>
      })}
    </div>
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Historial de activaciones</h2>
      {data.audit.length === 0 ? <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Aún no hay cambios manuales.</p> : <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
        {data.audit.map(event => <li key={event.id} className="py-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <span>{MODULE_REGISTRY[event.module_id as keyof typeof MODULE_REGISTRY]?.name ?? event.module_id} · {event.operation === 'DELETE' ? 'Restablecido' : event.new_enabled ? 'Activado' : 'Desactivado'}</span>
          <time dateTime={event.changed_at}>{new Date(event.changed_at).toLocaleString('es-BO')}</time>
        </li>)}
      </ul>}
    </div>
  </div>
}
