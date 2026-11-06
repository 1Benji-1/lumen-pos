import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import type { AdminStoreItem } from '@lumen-pos/types'
import { StoreStatusBadge } from './StoreStatusBadge'
import { StoreCard } from './StoreCard'

export type QuickTab = 'all' | 'trialing' | 'expiring' | 'active' | 'suspended'

export interface StoreExpirationInfo {
  isExpiring: boolean
  daysRemaining: number | null
  graceRemaining: number | null
  targetDate: string | null
  label: string | null
}

export function getStoreExpirationInfo(store: AdminStoreItem): StoreExpirationInfo {
  if (store.subscription_status === 'suspended' || store.subscription_status === 'canceled') {
    return { isExpiring: false, daysRemaining: null, graceRemaining: null, targetDate: null, label: null }
  }

  if (store.subscription_status === 'past_due') {
    const graceDays = store.grace_period_days ?? 5
    if (store.subscription_ends_at) {
      const endMs = new Date(store.subscription_ends_at).getTime()
      const nowMs = Date.now()
      const diffDays = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))
      const graceRemaining = Math.max(0, graceDays + diffDays)
      return {
        isExpiring: true,
        daysRemaining: diffDays,
        graceRemaining,
        targetDate: store.subscription_ends_at,
        label: `Gracia: ${graceRemaining} ${graceRemaining === 1 ? 'día' : 'días'}`,
      }
    }
    return {
      isExpiring: true,
      daysRemaining: -1,
      graceRemaining: 0,
      targetDate: null,
      label: 'Pago pendiente',
    }
  }

  const targetDateStr =
    store.subscription_status === 'trialing'
      ? store.trial_ends_at
      : store.subscription_ends_at

  if (!targetDateStr) {
    return { isExpiring: false, daysRemaining: null, graceRemaining: null, targetDate: null, label: null }
  }

  const endMs = new Date(targetDateStr).getTime()
  const nowMs = Date.now()
  const daysRemaining = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))

  const isExpiring = daysRemaining <= 7

  let label: string
  if (daysRemaining < 0) {
    label = 'Vencida'
  } else if (daysRemaining === 0) {
    label = 'Vence hoy'
  } else if (daysRemaining === 1) {
    label = 'Vence en 1 día'
  } else {
    label = `Vence en ${daysRemaining} días`
  }

  return {
    isExpiring,
    daysRemaining,
    graceRemaining: null,
    targetDate: targetDateStr,
    label,
  }
}

interface StoresTableProps {
  stores: AdminStoreItem[]
}

export function StoresTable({ stores }: StoresTableProps) {
  const [searchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as QuickTab | null

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [activeTab, setActiveTab] = useState<QuickTab>(tabFromUrl || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    if (tabFromUrl && ['all', 'trialing', 'expiring', 'active', 'suspended'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const navigate = useNavigate()

  const handleOpenDetail = (
    store: AdminStoreItem,
    tab: string = 'overview'
  ) => {
    navigate(tab === 'overview' ? `/stores/${store.id}` : `/stores/${store.id}?tab=${tab}`)
  }

  const handleOpenOverrides = (store: AdminStoreItem) => {
    navigate(`/stores/${store.id}?tab=overrides`)
  }

  const counts = {
    all: stores.length,
    trialing: stores.filter((s) => s.subscription_status === 'trialing').length,
    expiring: stores.filter((s) => getStoreExpirationInfo(s).isExpiring).length,
    active: stores.filter((s) => s.subscription_status === 'active').length,
    suspended: stores.filter(
      (s) => s.subscription_status === 'suspended' || s.subscription_status === 'canceled'
    ).length,
  }

  const filteredStores = stores
    .filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (store.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

      const matchesPlan = planFilter === 'all' || store.plan_code === planFilter

      let matchesTab = true
      if (activeTab === 'trialing') {
        matchesTab = store.subscription_status === 'trialing'
      } else if (activeTab === 'expiring') {
        matchesTab = getStoreExpirationInfo(store).isExpiring
      } else if (activeTab === 'active') {
        matchesTab = store.subscription_status === 'active'
      } else if (activeTab === 'suspended') {
        matchesTab =
          store.subscription_status === 'suspended' || store.subscription_status === 'canceled'
      }

      return matchesSearch && matchesPlan && matchesTab
    })
    .sort((a, b) => {
      if (activeTab === 'expiring') {
        const remA = getStoreExpirationInfo(a).daysRemaining ?? 9999
        const remB = getStoreExpirationInfo(b).daysRemaining ?? 9999
        return remA - remB
      }
      return 0
    })

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Nombre Comercio',
      'Propietario',
      'Correo',
      'Rubro',
      'Plan',
      'Estado',
      'Cajas Abiertas',
      'Articulos',
      'Ultima Venta',
    ]

    const rows = filteredStores.map((s) => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.owner_name || '').replace(/"/g, '""')}"`,
      s.owner_email || '',
      s.category_id || s.industry_sub_type || s.business_type || '',
      s.plan_name || s.plan_code,
      s.subscription_status,
      s.open_registers_count ?? 0,
      s.products_count ?? 0,
      s.last_sale_at ? new Date(s.last_sale_at).toISOString() : '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `lumen_tiendas_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Todas</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'all' ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trialing')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'trialing'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>En trial</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'trialing' ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {counts.trialing}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expiring')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'expiring'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Por vencer</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'expiring'
                ? 'bg-amber-500 text-white'
                : counts.expiring > 0
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/70'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {counts.expiring}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Activas</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'active' ? 'bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suspended')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'suspended'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Suspendidas</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'suspended' ? 'bg-rose-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {counts.suspended}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row gap-3 items-center justify-between shadow-2xs">
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tienda, dueño o correo..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
          />
          <svg
            className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
              }`}
              title="Vista en tarjetas operativas"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Tarjetas</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
              }`}
              title="Vista en tabla"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Tabla</span>
            </button>
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
          >
            <option value="all">Todos los planes</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Business</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Exportar directorio visible a archivo CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {filteredStores.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center text-xs text-zinc-500 dark:text-zinc-400 shadow-2xs">
          No se encontraron tiendas que coincidan con los criterios de búsqueda o filtros seleccionados.
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onOpenDetail={handleOpenDetail}
              onOpenOverrides={handleOpenOverrides}
            />
          ))}
        </div>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Comercio</th>
                  <th className="py-3 px-4 font-semibold">Propietario</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                  <th className="py-3 px-4 font-semibold">Última Venta</th>
                  <th className="py-3 px-4 font-semibold">Actividad Operativa</th>
                  <th className="py-3 px-4 font-semibold text-right">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                {filteredStores.map((store) => {
                  const overridesCount = Object.keys(store.feature_overrides || {}).length
                  const hasOpenRegisters = (store.open_registers_count ?? 0) > 0
                  const exp = getStoreExpirationInfo(store)

                  return (
                    <tr key={store.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(store, 'overview')}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-semibold text-zinc-950 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition">
                            {store.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                            {store.id.slice(0, 8)}...
                          </div>
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-200">
                          {store.owner_name || 'Sin nombre'}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{store.owner_email || '—'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-zinc-900 dark:text-zinc-200">
                          {store.plan_name || 'Sin plan'}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                          {store.billing_cycle || 'Mensual'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <StoreStatusBadge status={store.subscription_status} />
                          {exp.label && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                                store.subscription_status === 'past_due'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
                                  : exp.daysRemaining !== null && exp.daysRemaining <= 3
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80'
                                  : exp.daysRemaining !== null && exp.daysRemaining <= 7
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {exp.label}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-zinc-900 dark:text-zinc-200">
                          {store.last_sale_at
                            ? new Date(store.last_sale_at).toLocaleDateString('es-BO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Sin ventas'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {hasOpenRegisters ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {store.open_registers_count} {store.open_registers_count === 1 ? 'caja activa' : 'cajas activas'}
                            </span>
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">Cajas cerradas</span>
                          )}

                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {store.products_count ?? 0} {store.products_count === 1 ? 'producto' : 'productos'} en catálogo
                          </span>

                          {overridesCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                              {overridesCount} overrides
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(store, 'overview')}
                            className="px-2.5 py-1 text-xs font-semibold text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white rounded transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Abrir panel de control de la tienda"
                          >
                            <span>Control tienda</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenOverrides(store)}
                            className="px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                            title="Gestionar excepciones de funciones"
                          >
                            Overrides
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
