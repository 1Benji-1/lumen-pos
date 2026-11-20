import { useState } from 'react'
import { SETTINGS_GROUPS, SettingsSidebar, type SettingsSectionId } from './components/SettingsSidebar'
import { useOrganizationModules } from '../../core/access/useOrganizationModules'
import { useOrganizationSettings } from '../../core/configuration/useOrganizationSettings'
import { GeneralSettingsSection } from './components/GeneralSettingsSection'
import { TicketSettingsSection } from './components/TicketSettingsSection'
import { RegionalSettingsSection } from './components/RegionalSettingsSection'
import { PosSettingsSection } from './components/PosSettingsSection'
import { RegistersSettingsSection } from './components/RegistersSettingsSection'
import { InventoryStockSection } from './components/InventoryStockSection'
import { InventoryLabelsSection } from './components/InventoryLabelsSection'
import { InventoryAuditSection } from './components/InventoryAuditSection'
import { PlanLimitsSection } from './components/PlanLimitsSection'
import { ModuleSettingsSection } from './components/ModuleSettingsSection'

const SECTION_HEADERS: Record<SettingsSectionId, { title: string; subtitle: string }> = {
  general: {
    title: 'Ajustes Generales',
    subtitle: 'Identidad, datos fiscales y contacto de la organización.',
  },
  tickets: {
    title: 'Comprobantes y Recibos',
    subtitle: 'Formato de tickets impresos, leyendas de garantía y políticas de devolución.',
  },
  regional: {
    title: 'Moneda y Horarios',
    subtitle: 'Divisa principal, símbolo comercial y zona horaria local de la organización.',
  },
  pos: {
    title: 'Punto de Venta (POS)',
    subtitle: 'Reglas de cobro en mostrador, venta con stock negativo y auto-impresión.',
  },
  registers: {
    title: 'Gaveta y Turnos de Caja',
    subtitle: 'Fondo fijo sugerido para apertura y límites de duración de turnos.',
  },
  inventory_stock: {
    title: 'Existencias y Alertas',
    subtitle: 'Umbral global de stock mínimo y unidad de medida predeterminada.',
  },
  inventory_labels: {
    title: 'Etiquetas y Códigos de Barras',
    subtitle: 'Dimensiones del papel térmico adhesivo y datos impresos en la etiqueta.',
  },
  inventory_audit: {
    title: 'Auditoría y Compras',
    subtitle: 'Alertas tempranas de vencimiento, conteo a ciegas y correlativos de compra.',
  },
  plan_limits: {
    title: 'Plan y Límites de la Organización',
    subtitle: 'Nivel de suscripción actual, consumo de colaboradores y opciones de ampliación.',
  },
  modules: {
    title: 'Módulos de la organización',
    subtitle: 'Área, disponibilidad y activación de herramientas de la organización.',
  },
}

export function SettingsPage() {
  const [selectedSection, setSelectedSection] = useState<SettingsSectionId>('general')
  const { settings, isLoading } = useOrganizationSettings()
  const { canAccessModule } = useOrganizationModules()
  const groups = SETTINGS_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => !item.moduleId || canAccessModule(item.moduleId)),
  })).filter(group => group.items.length > 0)
  const activeSection = groups.some(group => group.items.some(item => item.id === selectedSection))
    ? selectedSection : 'general'

  const currentHeader = SECTION_HEADERS[activeSection]

  return (
    <div className="flex-1 min-h-[calc(100vh-50px)] bg-[#E8EDDF] flex items-stretch">
      {/* 1. Sub-sidebar lateral estático continuo 100% viewport */}
      <SettingsSidebar
        activeSection={activeSection}
        onSelectSection={setSelectedSection}
        groups={groups}
      />

      {/* 2. Área principal de contenido */}
      <main className="flex-1 min-w-0 px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Cabecera principal estilo Supabase */}
          <div className="pb-6 border-b border-[#CFDBD5]">
            <h1 className="text-xl sm:text-2xl font-bold text-[#242423] tracking-tight">
              {currentHeader.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5D5A] mt-1">
              {currentHeader.subtitle}
            </p>
          </div>

          {/* Contenido de la sección seleccionada */}
          {isLoading && activeSection !== 'plan_limits' ? (
            <div className="py-12 text-center text-xs text-[#5A5D5A]">
              Cargando ajustes de la organización...
            </div>
          ) : (
            <>
              {activeSection === 'general' && <GeneralSettingsSection settings={settings} />}
              {activeSection === 'tickets' && <TicketSettingsSection settings={settings} />}
              {activeSection === 'regional' && <RegionalSettingsSection settings={settings} />}
              {activeSection === 'pos' && <PosSettingsSection settings={settings} />}
              {activeSection === 'registers' && <RegistersSettingsSection settings={settings} />}
              {activeSection === 'inventory_stock' && <InventoryStockSection settings={settings} />}
              {activeSection === 'inventory_labels' && <InventoryLabelsSection settings={settings} />}
              {activeSection === 'inventory_audit' && <InventoryAuditSection settings={settings} />}
              {activeSection === 'plan_limits' && <PlanLimitsSection />}
              {activeSection === 'modules' && <ModuleSettingsSection />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
