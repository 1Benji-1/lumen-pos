import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'
import { useStoreModules } from '../../shared/hooks/useStoreModules'
import { type Permission, type ModuleId } from '@lumen-pos/types'

// Íconos coherentes con trazo uniforme (strokeWidth 1.8)
function HomeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  )
}

function CartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  )
}

function BoxIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  )
}

function UsersIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  )
}

function ChartIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}

function StaffIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Persona / Colaborador */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 11a4 4 0 100-8 4 4 0 000 8zm-6 9a6 6 0 0112 0v1H3v-1z"
      />
      {/* Engranaje de roles / permisos */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M18 12a2 2 0 100-4 2 2 0 000 4zm0-3.5V7m0 6v-1.5m2.5-2H19m-3.5 0H14m4.5-1.8l-1 1m-3 3l-1 1m0-5l1 1m3 3l1 1"
      />
    </svg>
  )
}

function SettingsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

interface SidebarItemDef {
  id: string
  label: string
  path: string
  exact?: boolean
  permission?: Permission
  moduleId?: ModuleId
  icon: (props: { className?: string }) => ReactNode
}

// Estructura de navegación agrupada en 4 bloques separados por líneas divisorias
const SIDEBAR_BLOCKS: SidebarItemDef[][] = [
  // Bloque 1: Inicio
  [
    {
      id: 'dashboard',
      label: 'Inicio',
      path: '/',
      exact: true,
      permission: 'dashboard:view',
      moduleId: 'dashboard',
      icon: HomeIcon,
    },
  ],
  // Bloque 2: Operaciones diarias (Caja e Inventario)
  [
    {
      id: 'pos',
      label: 'Caja',
      path: '/pos',
      permission: 'pos:access',
      moduleId: 'pos',
      icon: CartIcon,
    },
    {
      id: 'inventory',
      label: 'Inventario',
      path: '/inventario',
      permission: 'inventory:view',
      moduleId: 'inventory',
      icon: BoxIcon,
    },
  ],
  // Bloque 3: Relaciones y Rendimiento (Clientes y Reportes)
  [
    {
      id: 'customers',
      label: 'Clientes',
      path: '/customers',
      permission: 'customers:view',
      moduleId: 'customers',
      icon: UsersIcon,
    },
    {
      id: 'analytics',
      label: 'Reportes',
      path: '/analytics',
      permission: 'analytics:view',
      moduleId: 'analytics',
      icon: ChartIcon,
    },
  ],
  // Bloque 4: Administración de Personal (Equipo)
  [
    {
      id: 'staff',
      label: 'Equipo',
      path: '/staff',
      permission: 'staff:view',
      moduleId: 'staff',
      icon: StaffIcon,
    },
  ],
]

export function AppSidebar() {
  const { hasPermission, loading: roleLoading } = useCurrentUserRole()
  const { canAccessModule, isLoading: modulesLoading, error } = useStoreModules()

  const isItemVisible = (item: SidebarItemDef) => {
    if (roleLoading || modulesLoading || error) return false
    if (item.moduleId && !canAccessModule(item.moduleId)) return false
    if (item.permission && !hasPermission(item.permission)) return false
    return true
  }

  // Filtrar bloques según los permisos del usuario y módulos habilitados en la tienda
  const visibleBlocks = SIDEBAR_BLOCKS.map((block) =>
    block.filter(isItemVisible)
  ).filter((block) => block.length > 0)

  const canAccessSettings = !roleLoading && !modulesLoading && !error && canAccessModule('settings') && hasPermission('settings:manage')

  return (
    <div className="w-[50px] shrink-0 relative z-30">
      <aside
        className="fixed top-[50px] left-0 bottom-0 w-[50px] hover:w-56 group/sidebar transition-[width] duration-300 ease-in-out bg-[#E8EDDF] border-r border-[#CFDBD5] flex flex-col justify-between py-3 select-none overflow-x-hidden overflow-y-auto shadow-xs hover:shadow-xl hover:shadow-[#242423]/10"
        aria-label="Sidebar de navegación"
      >
        {/* Grupo superior: Bloques de módulos separados por barras divisorias */}
        <div className="space-y-1 px-1">
          {visibleBlocks.map((block, blockIndex) => (
            <div key={`block-${blockIndex}`} className="space-y-1">
              {/* Barra divisoria sutil entre bloques funcionales */}
              {blockIndex > 0 && (
                <div
                  role="separator"
                  className="my-2 mx-1 border-t border-[#CFDBD5]"
                />
              )}

              {block.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) =>
                      `w-full flex items-center h-10 px-2.5 rounded-md transition-colors group/item relative ${
                        isActive
                          ? 'bg-[#E5E5E5] text-[#242423] font-semibold shadow-xs'
                          : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/70'
                      }`
                    }
                    title={item.label}
                    aria-label={item.label}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Contenedor exacto de 20px (w-5) para centrado del ícono */}
                        <div className="w-5 h-10 flex items-center justify-center shrink-0">
                          <Icon
                            className={`w-5 h-5 transition-colors ${
                              isActive
                                ? 'text-[#242423]'
                                : 'text-[#5A5D5A] group-hover/item:text-[#242423]'
                            }`}
                          />
                        </div>

                        {/* Etiqueta / Texto visible únicamente al expandir por hover */}
                        <span className="text-xs text-[#242423] whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75 pl-3 pr-2 font-medium">
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </div>

        {/* Grupo inferior: Ajustes fijo al pie */}
        {canAccessSettings && (
          <div className="px-1 pt-2 border-t border-[#CFDBD5]">
            <NavLink
              to="/configuracion"
              className={({ isActive }) =>
                `w-full flex items-center h-10 px-2.5 rounded-md transition-colors group/item relative ${
                  isActive
                    ? 'bg-[#E5E5E5] text-[#242423] font-semibold shadow-xs'
                    : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/70'
                }`
              }
              title="Ajustes"
              aria-label="Ajustes"
            >
              {({ isActive }) => (
                <>
                  <div className="w-5 h-10 flex items-center justify-center shrink-0">
                    <SettingsIcon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? 'text-[#242423]'
                          : 'text-[#5A5D5A] group-hover/item:text-[#242423]'
                      }`}
                    />
                  </div>

                  <span className="text-xs text-[#242423] whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-75 pl-3 pr-2 font-medium">
                    Ajustes
                  </span>
                </>
              )}
            </NavLink>
          </div>
        )}
      </aside>
    </div>
  )
}
export default AppSidebar
