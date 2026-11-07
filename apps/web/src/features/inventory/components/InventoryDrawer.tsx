import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useStoreEntitlements } from '../../../shared/hooks/useStoreEntitlements'

interface InventoryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryDrawer({ isOpen, onClose }: InventoryDrawerProps) {
  const { isFeatureEnabled } = useStoreEntitlements()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop traslúcido: debajo de la navbar */}
      <div
        className={`fixed top-[50px] inset-x-0 bottom-0 bg-[#242423]/50 z-30 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral que se abre debajo de la navbar desde la izquierda hacia la derecha */}
      <aside
        className={`fixed top-[50px] left-0 bottom-0 z-30 w-72 bg-white border-r border-[#CFDBD5] shadow-xl flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera del submenú de Inventario */}
        <div className="h-14 px-5 border-b border-[#CFDBD5] bg-[#E8EDDF]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#242423]">Inventario</span>
              <span className="text-xs block text-[#5A5D5A]">Menú del módulo</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition"
            aria-label="Cerrar submenú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Secciones de navegación */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {/* Grupo: Catálogo */}
          <div>
            <span className="px-3 text-xs font-bold text-[#5A5D5A] uppercase tracking-wider block mb-1">
              Catálogo
            </span>
            <div className="space-y-0.5">
              <NavLink
                to="/inventario"
                end
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Lista de productos
              </NavLink>
            </div>
          </div>

          {/* Grupo: Control y Stock */}
          <div>
            <span className="px-3 text-xs font-bold text-[#5A5D5A] uppercase tracking-wider block mb-1">
              Control y Stock
            </span>
            <div className="space-y-0.5">
              <NavLink
                to="/inventario/movimientos"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Historial de movimientos
              </NavLink>

              <NavLink
                to="/inventario/conteo-fisico"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">Conteo y reconciliación</span>
                {!isFeatureEnabled('physical_count') && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] font-semibold tracking-wide">
                    Business
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/inventario/ajuste-precios"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="flex-1">Ajuste masivo de precios</span>
                {!isFeatureEnabled('batch_price_adjust') && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] font-semibold tracking-wide">
                    Business
                  </span>
                )}
              </NavLink>
            </div>
          </div>

          {/* Grupo: Abastecimiento */}
          <div>
            <span className="px-3 text-xs font-bold text-[#5A5D5A] uppercase tracking-wider block mb-1">
              Abastecimiento
            </span>
            <div className="space-y-0.5">
              <NavLink
                to="/inventario/proveedores"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="flex-1">Proveedores</span>
                {!isFeatureEnabled('purchase_orders') && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] font-semibold tracking-wide">
                    Pro
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/inventario/ordenes-compra"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition ${
                    isActive
                      ? 'bg-[#F5CB5C]/25 text-[#242423] font-semibold shadow-2xs'
                      : 'text-[#333533] hover:bg-[#E8EDDF]/60 hover:text-[#242423]'
                  }`
                }
              >
                <svg className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1">Órdenes de compra</span>
                {!isFeatureEnabled('purchase_orders') && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] font-semibold tracking-wide">
                    Pro
                  </span>
                )}
              </NavLink>
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}
export default InventoryDrawer
