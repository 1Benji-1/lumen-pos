import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCurrentUserRole } from '../../../shared/hooks/useCurrentUserRole'

interface PosTabItem {
  path: string
  label: string
  exact?: boolean
  requiredPermission?: string
}

export const POS_TABS: PosTabItem[] = [
  { path: '/pos', label: 'Terminal de Venta (F1)', exact: true },
  { path: '/pos/ventas', label: 'Historial de Ventas' },
]

interface PosNavTabsProps {
  className?: string
  /** @deprecated Sincronización offline fue reubicada a Ajustes */
  pendingOfflineCount?: number
}

export function PosNavTabs({ className = 'mb-6' }: PosNavTabsProps) {
  const navigate = useNavigate()
  const { hasPermission, loading } = useCurrentUserRole()

  const visibleTabs = POS_TABS.filter((tab) => {
    if (tab.requiredPermission && !loading && !hasPermission(tab.requiredPermission as any)) {
      return false
    }
    return true
  })

  // Atajo de teclado global F1: volver instantáneamente al terminal de venta
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F1') {
        e.preventDefault()
        navigate('/pos')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return (
    <div className={`border-b border-[#CFDBD5] ${className}`.trim()}>
      <nav className="flex items-center gap-1 overflow-x-auto pb-px scrollbar-none" aria-label="Secciones de Punto de Venta">
        {visibleTabs.map((tab) => (
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
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default PosNavTabs
