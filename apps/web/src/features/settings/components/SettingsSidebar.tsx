import type { ModuleId } from '@lumen-pos/types'

export type SettingsSectionId =
  | 'general'
  | 'tickets'
  | 'regional'
  | 'pos'
  | 'registers'
  | 'inventory_stock'
  | 'inventory_labels'
  | 'inventory_audit'
  | 'modules'
  | 'plan_limits'

export interface SettingsGroup {
  group: string
  items: { id: SettingsSectionId; label: string; moduleId?: ModuleId }[]
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    group: 'Organización',
    items: [
      { id: 'general', label: 'General' },
      { id: 'tickets', label: 'Comprobantes', moduleId: 'pos' },
      { id: 'regional', label: 'Moneda y Horarios' },
    ],
  },
  {
    group: 'Ventas y Caja',
    items: [
      { id: 'pos', label: 'Punto de Venta', moduleId: 'pos' },
      { id: 'registers', label: 'Gaveta y Turnos', moduleId: 'pos' },
    ],
  },
  {
    group: 'Inventario',
    items: [
      { id: 'inventory_stock', label: 'Existencias y Alertas', moduleId: 'inventory' },
      { id: 'inventory_labels', label: 'Etiquetas y Códigos', moduleId: 'inventory' },
      { id: 'inventory_audit', label: 'Auditoría y Compras', moduleId: 'inventory' },
    ],
  },
  {
    group: 'Cuenta',
    items: [
      { id: 'plan_limits', label: 'Plan y Límites' },
      { id: 'modules', label: 'Módulos' },
    ],
  },
]

interface SettingsSidebarProps {
  activeSection: SettingsSectionId
  onSelectSection: (section: SettingsSectionId) => void
  groups?: SettingsGroup[]
}

export function SettingsSidebar({
  activeSection,
  onSelectSection,
  groups = SETTINGS_GROUPS,
}: SettingsSidebarProps) {
  return (
    <aside
      className="w-60 md:w-64 shrink-0 bg-[#E8EDDF] border-r border-[#CFDBD5] select-none flex flex-col sticky top-[50px] h-[calc(100vh-50px)] self-start"
      aria-label="Navegación de Ajustes"
    >
      {/* Título superior de sección alineado a la misma altura que el divisor de Inicio y Caja (64px) */}
      <div className="h-[64px] px-6 border-b border-[#CFDBD5] flex items-center shrink-0">
        <h2 className="text-sm font-semibold text-[#242423] tracking-tight">
          Ajustes
        </h2>
      </div>

      {/* Navegación por grupos temáticos con fondo idéntico al sidebar principal */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.group}>
            <span className="px-3 pb-1.5 text-[10px] font-bold text-[#5A5D5A] tracking-wider uppercase block">
              {group.group}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectSection(item.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                      isActive
                        ? 'bg-[#E5E5E5] text-[#242423] font-semibold shadow-xs'
                        : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/70 font-normal'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
