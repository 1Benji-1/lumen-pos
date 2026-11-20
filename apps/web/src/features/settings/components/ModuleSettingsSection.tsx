import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AREA_NAMES, MODULE_REGISTRY, type ModuleId } from '@lumen-pos/types'
import { useCurrentUserRole } from '../../../core/users/useCurrentUserRole'
import { useModuleActivations } from '../../../core/access/legacy/useModuleActivations'
import { useOrganizationModules } from '../../../core/access/useOrganizationModules'
import { supabase } from '../../../shared/lib/supabaseClient'

export function ModuleSettingsSection() {
  const { organizationId: storeId, branchId, areaId, compatibilityMode, defaultModuleIds, isLoading, error, getModuleAccess } = useOrganizationModules()
  const { data: rows } = useModuleActivations(storeId, branchId)
  const { isOwner } = useCurrentUserRole()
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<ModuleId | null>(null)
  const [draft, setDraft] = useState<Partial<Record<ModuleId, string>>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-[#5A5D5A]">Cargando módulos de la organización...</p>
  if (error || !storeId || !branchId || (!areaId && !compatibilityMode) || !rows) return <p role="alert" className="text-sm text-[#BC4749]">No se pudieron cargar los módulos. Revisa la conexión e inténtalo de nuevo.</p>

  const defaults = defaultModuleIds
  const available = Object.values(MODULE_REGISTRY).filter(module =>
    module.implementationStatus === 'available' && (compatibilityMode || defaults.includes(module.id)),
  )
  const planned = defaults.map(id => MODULE_REGISTRY[id]).filter(module => module.implementationStatus === 'planned')

  async function changeActivation(moduleId: ModuleId, value: string) {
    setPendingId(moduleId)
    setDraft(current => ({ ...current, [moduleId]: value }))
    setMessage(null)
    setSaveError(null)
    try {
      const { error: rpcError } = await supabase.rpc('set_module_activation' as never, {
        p_store_id: storeId,
        p_module_id: moduleId,
        p_enabled: value === 'default' ? null : value === 'true',
      } as never)
      if (rpcError) throw rpcError
      await queryClient.invalidateQueries({ queryKey: ['moduleActivations', storeId, branchId] })
      setMessage('Activación guardada.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Inténtalo de nuevo.')
    } finally {
      setDraft(current => { const next = { ...current }; delete next[moduleId]; return next })
      setPendingId(null)
    }
  }

  return <div className="space-y-6">
    <div className="rounded-xl bg-white border border-[#CFDBD5] p-5 space-y-2">
      <h2 className="text-base font-semibold text-[#242423]">Área de la organización</h2>
      <p className="text-sm text-[#5A5D5A]">{areaId ? AREA_NAMES[areaId] : 'Perfil anterior'}</p>
      <p className="text-xs text-[#5A5D5A]">{compatibilityMode
        ? 'Se conservan los módulos iniciales y las activaciones de la configuración anterior.'
        : 'El área define los módulos iniciales. El plan y las activaciones determinan su disponibilidad.'}</p>
    </div>
    {message && <p role="status" className="text-sm text-[#3B6B3A]">{message}</p>}
    {saveError && <p role="alert" className="text-sm text-[#BC4749]">No se pudo guardar: {saveError}</p>}
    {!isOwner && <p className="text-sm text-[#5A5D5A]">Solo el propietario puede cambiar las activaciones. Puedes consultar su estado.</p>}
    <div className="rounded-xl bg-white border border-[#CFDBD5] divide-y divide-[#CFDBD5]">
      {available.map(module => {
        const scopeBranchId = module.scope === 'branch' ? branchId : null
        const row = rows.find(item => item.module_id === module.id && item.branch_id === scopeBranchId)
        const access = getModuleAccess(module.id)
        const protectedModule = module.id === 'dashboard' || module.id === 'settings'
        const value = draft[module.id] ?? (row ? String(row.enabled) : 'default')
        const status = access.reason === 'plan_disabled' ? 'Excluido por el plan'
          : access.reason === 'organization_disabled' ? 'Desactivado'
          : access.reason === 'area_disabled' ? 'Fuera del catálogo inicial'
          : access.allowed ? 'Activo' : 'No disponible'
        return <div key={module.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#242423]">{module.name}</span>
            </div>
            <p className="text-xs text-[#5A5D5A] mt-1">{module.description}</p>
            <p className="text-xs font-medium text-[#242423] mt-1">{status}{defaults.includes(module.id) ? ' · Catálogo inicial' : ''}</p>
          </div>
          {isOwner && !protectedModule ? <select
            aria-label={`Activación de ${module.name}`}
            value={value}
            disabled={pendingId !== null}
            onChange={event => void changeActivation(module.id, event.target.value)}
            className="w-full sm:w-56 min-h-11 px-3 py-2 bg-white border border-[#CFDBD5] rounded-lg text-sm text-[#242423] focus:outline-none focus:ring-2 focus:ring-[#F5CB5C] disabled:opacity-60"
          >
            <option value="default">Usar valor inicial</option>
            <option value="true" disabled={access.reason === 'plan_disabled'}>Activar</option>
            <option value="false">Desactivar</option>
          </select> : <span className="text-xs text-[#5A5D5A]">{protectedModule ? 'Acceso básico' : status}</span>}
        </div>
      })}
    </div>
    {planned.length > 0 && <div className="rounded-xl bg-white border border-[#CFDBD5] p-5">
      <h2 className="text-sm font-semibold text-[#242423]">Módulos en preparación</h2>
      <p className="text-xs text-[#5A5D5A] mt-1">Todavía no se pueden activar ni utilizar.</p>
      <div className="flex flex-wrap gap-2 mt-3">{planned.map(module => <span key={module.id} className="text-xs px-2.5 py-1 rounded-full bg-[#E8EDDF] text-[#5A5D5A]">{module.name}</span>)}</div>
    </div>}
  </div>
}
