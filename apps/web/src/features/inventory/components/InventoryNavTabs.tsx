import { NavLink } from 'react-router-dom'

export const INVENTORY_TABS = [
  { path: '/inventario', label: 'Catálogo y Stock', exact: true },
  { path: '/inventario/movimientos', label: 'Movimientos Kardex' },
  { path: '/inventario/conteo-fisico', label: 'Conteo Físico' },
  { path: '/inventario/ordenes-compra', label: 'Órdenes de Compra' },
  { path: '/inventario/proveedores', label: 'Proveedores' },
  { path: '/inventario/ajuste-precios', label: 'Ajuste Masivo' },
]

interface InventoryNavTabsProps {
  className?: string
}

export function InventoryNavTabs({ className = '' }: InventoryNavTabsProps) {
  return (
    <div className={`border-b border-[#CFDBD5] mb-8 ${className}`.trim()}>
      <nav className="flex items-center gap-1 overflow-x-auto pb-px scrollbar-none" aria-label="Secciones de inventario">
        {INVENTORY_TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.exact}
            className={({ isActive }) =>
              `px-3.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.98] flex items-center gap-2 ${
                isActive
                  ? 'border-[#242423] text-[#242423] font-semibold bg-white/80 rounded-t-md shadow-2xs'
                  : 'border-transparent text-[#5A5D5A] hover:text-[#242423] hover:border-[#CFDBD5] hover:bg-white/50'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
