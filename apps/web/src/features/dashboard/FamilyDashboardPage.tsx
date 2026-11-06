import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BUSINESS_CATEGORIES, BUSINESS_FAMILIES, getDefaultModuleIds, MODULE_REGISTRY, type BusinessProfile, type ModuleId } from '@lumen-pos/types'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'
import { useStoreModules } from '../../shared/hooks/useStoreModules'
import { getLowStockAlerts, getTodaySalesSummary } from './services/dashboardService'

type ActionModule = keyof typeof permissions

const priorities: Record<BusinessProfile['familyId'], ActionModule[]> = {
  retail: ['inventory', 'pos', 'customers', 'staff', 'analytics', 'settings'],
  gastronomy: ['pos', 'inventory', 'customers', 'staff', 'analytics', 'settings'],
  services: ['pos', 'customers', 'inventory', 'staff', 'analytics', 'settings'],
  wholesale: ['inventory', 'pos', 'customers', 'staff', 'analytics', 'settings'],
}

const permissions = {
  pos: 'pos:access', inventory: 'inventory:view', customers: 'customers:view',
  staff: 'staff:view', analytics: 'analytics:view', settings: 'settings:manage',
} as const

function headingFor(profile: BusinessProfile, pos: boolean, inventory: boolean) {
  if (profile.familyId === 'gastronomy') return pos ? 'Ventas de gastronomía' : inventory ? 'Inventario y clientes' : 'Gestión de clientes'
  if (profile.familyId === 'services') return pos ? 'Atención y ventas' : 'Atención a clientes'
  if (profile.familyId === 'wholesale') return 'Catálogo y distribución'
  return inventory ? 'Catálogo y existencias' : 'Operación comercial'
}

function summaryFor(profile: BusinessProfile, pos: boolean, inventory: boolean) {
  if (profile.familyId === 'gastronomy') return pos
    ? 'Consulta las ventas y existencias de hoy. Pedidos, Cocina y Mesas se habilitarán cuando estén implementados.'
    : 'Controla existencias y clientes. El flujo de pedidos y cocina aún está en preparación.'
  if (profile.familyId === 'services') return pos
    ? 'Atiende clientes y consulta las ventas del mostrador.'
    : inventory ? 'Consulta clientes y existencias mientras se desarrolla el flujo de trabajos.' : 'Gestiona clientes y equipo desde las herramientas disponibles.'
  if (profile.familyId === 'wholesale') return 'Revisa existencias y clientes. Pedidos, cotizaciones y distribución siguen en preparación.'
  return 'Consulta el catálogo y accede a las herramientas habilitadas de la tienda.'
}

function primaryActionName(moduleId: ModuleId) {
  if (moduleId === 'pos') return 'Abrir punto de venta'
  if (moduleId === 'inventory') return 'Revisar inventario'
  if (moduleId === 'customers') return 'Ver clientes'
  if (moduleId === 'staff') return 'Ver equipo'
  if (moduleId === 'analytics') return 'Ver reportes'
  return 'Abrir ajustes'
}

export function FamilyDashboardPage({ profile }: { profile: BusinessProfile }) {
  const { storeId, storeName, canAccessModule } = useStoreModules()
  const { hasPermission } = useCurrentUserRole()
  const canOpen = (id: keyof typeof permissions) => canAccessModule(id) && hasPermission(permissions[id])
  const pos = canOpen('pos')
  const inventory = canOpen('inventory')
  const sales = useQuery({
    queryKey: ['dashboard-family-sales', storeId],
    queryFn: () => getTodaySalesSummary(storeId!),
    enabled: !!storeId && pos,
    staleTime: 30_000,
  })
  const stock = useQuery({
    queryKey: ['dashboard-family-stock', storeId],
    queryFn: () => getLowStockAlerts(storeId!),
    enabled: !!storeId && inventory,
    staleTime: 30_000,
  })
  const actions = priorities[profile.familyId].filter(id => canOpen(id))
  const planned = getDefaultModuleIds(profile.categoryId).map(id => MODULE_REGISTRY[id]).filter(module => module.implementationStatus === 'planned')

  return <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-7 text-[#242423]">
    <header className="border-b border-[#CFDBD5] pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-[#5A5D5A]">{storeName} · {BUSINESS_CATEGORIES[profile.categoryId].name}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{headingFor(profile, pos, inventory)}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5A5D5A]">{summaryFor(profile, pos, inventory)}</p>
      </div>
      {actions[0] && <Link to={MODULE_REGISTRY[actions[0]].path!} className="inline-flex min-h-11 items-center rounded-lg bg-[#F5CB5C] px-4 py-2.5 text-sm font-semibold text-[#242423] hover:bg-[#E5B946] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242423]">
        {primaryActionName(actions[0])}
      </Link>}
    </header>

    {(pos || inventory) && <section aria-label="Estado de hoy" className="grid gap-4 md:grid-cols-2">
      {pos && <div className="rounded-xl border border-[#CFDBD5] bg-white p-5">
        <h2 className="text-sm font-semibold">Ventas de hoy</h2>
        {sales.isLoading ? <p className="mt-3 text-sm text-[#5A5D5A]">Cargando ventas...</p>
          : sales.isError ? <p role="alert" className="mt-3 text-sm text-[#BC4749]">No se pudieron consultar las ventas.</p>
          : <><p className="mt-3 text-3xl font-bold tabular-nums">Bs {sales.data?.totalAmount.toFixed(2)}</p><p className="mt-1 text-sm text-[#5A5D5A]">{sales.data?.transactionCount} ventas registradas</p></>}
      </div>}
      {inventory && <div className="rounded-xl border border-[#CFDBD5] bg-white p-5">
        <h2 className="text-sm font-semibold">Alertas de stock</h2>
        {stock.isLoading ? <p className="mt-3 text-sm text-[#5A5D5A]">Cargando existencias...</p>
          : stock.isError ? <p role="alert" className="mt-3 text-sm text-[#BC4749]">No se pudieron consultar las existencias.</p>
          : <><p className="mt-3 text-3xl font-bold tabular-nums">{stock.data?.lowStockCount}</p><p className="mt-1 text-sm text-[#5A5D5A]">productos en o bajo el mínimo</p></>}
      </div>}
    </section>}

    <section aria-labelledby="family-actions" className="space-y-3">
      <h2 id="family-actions" className="text-base font-semibold">Continuar trabajando</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.filter(id => id !== actions[0]).map(id => <Link key={id} to={MODULE_REGISTRY[id].path!} className="flex min-h-16 items-center justify-between rounded-xl border border-[#CFDBD5] bg-white px-5 py-4 text-sm font-semibold hover:border-[#588157] hover:bg-[#F7F9F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242423]">
          <span>{MODULE_REGISTRY[id].name}</span><span aria-hidden="true" className="text-xs text-[#5A5D5A]">Abrir</span>
        </Link>)}
      </div>
    </section>

    {planned.length > 0 && <section aria-labelledby="family-planned" className="rounded-xl border border-[#CFDBD5] bg-[#F7F9F4] p-5">
      <h2 id="family-planned" className="text-sm font-semibold">Próximas herramientas para {BUSINESS_FAMILIES[profile.familyId].name.toLowerCase()}</h2>
      <p className="mt-1 text-sm text-[#5A5D5A]">Estas herramientas están planificadas y aún no se pueden usar.</p>
      <p className="mt-3 text-sm text-[#242423]">{planned.map(module => module.name).join(' · ')}</p>
    </section>}
  </main>
}
