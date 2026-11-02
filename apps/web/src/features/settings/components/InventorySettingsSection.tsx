import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface InventorySettingsSectionProps {
  settings?: StoreSettings
}

const COMMON_UNITS = [
  { value: 'u', label: 'Unidad (u)' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'l', label: 'Litro (L)' },
  { value: 'pack', label: 'Paquete / Pack' },
]

export function InventorySettingsSection({ settings }: InventorySettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  // Existencias y reposición
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number | ''>(5)
  const [defaultProductUnit, setDefaultProductUnit] = useState('u')
  const [purchaseOrderPrefix, setPurchaseOrderPrefix] = useState('OC-')

  // Control y auditoría
  const [expiryAlertDays, setExpiryAlertDays] = useState<number | ''>(30)
  const [blindPhysicalCount, setBlindPhysicalCount] = useState(false)

  // Feedback de guardado
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setDefaultLowStockThreshold(settings.default_low_stock_threshold ?? 5)
      setDefaultProductUnit(settings.default_product_unit || 'u')
      setPurchaseOrderPrefix(settings.purchase_order_prefix || 'OC-')
      setExpiryAlertDays(settings.expiry_alert_days ?? 30)
      setBlindPhysicalCount(Boolean(settings.blind_physical_count))
    }
  }, [settings])

  const handleSaveReplenishment = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        default_low_stock_threshold: Number(defaultLowStockThreshold) || 0,
        default_product_unit: defaultProductUnit,
        purchase_order_prefix: purchaseOrderPrefix.trim() || 'OC-',
      })
      setStatusMessage('Parámetros de reposición guardados correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar los parámetros')
    }
  }

  const handleSaveAudit = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        expiry_alert_days: Number(expiryAlertDays) || 0,
        blind_physical_count: blindPhysicalCount,
      })
      setStatusMessage('Reglas de auditoría guardadas correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar las reglas')
    }
  }

  return (
    <div className="space-y-10">
      {/* 1. Tarjeta: Existencias y reposición */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Existencias y parámetros de reposición
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Umbral de stock mínimo global */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <label htmlFor="low_stock" className="text-xs font-semibold text-[#242423] block">
                Umbral global de stock mínimo
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Nivel por defecto para disparar alertas de stock crítico y alimentar sugerencias de compra.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  id="low_stock"
                  type="number"
                  min="0"
                  value={defaultLowStockThreshold}
                  onChange={(e) => setDefaultLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="5"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
                />
                <span className="text-xs text-[#5A5D5A] shrink-0">unidades</span>
              </div>
            </div>
          </div>

          {/* Unidad de medida por defecto */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <label htmlFor="default_unit" className="text-xs font-semibold text-[#242423] block">
                Unidad de medida predeterminada
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Unidad seleccionada automáticamente al crear nuevos productos en el catálogo.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0">
              <select
                id="default_unit"
                value={defaultProductUnit}
                onChange={(e) => setDefaultProductUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prefijo de orden de compra */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <label htmlFor="po_prefix" className="text-xs font-semibold text-[#242423] block">
                Prefijo para órdenes de compra
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Código identificador ante proveedores (ej. OC- genera OC-0001, OC-0002).
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0">
              <input
                id="po_prefix"
                type="text"
                value={purchaseOrderPrefix}
                onChange={(e) => setPurchaseOrderPrefix(e.target.value)}
                placeholder="OC-"
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors uppercase font-mono"
              />
            </div>
          </div>

          {/* Pie de tarjeta */}
          <div className="px-5 py-3 bg-[#F7F9F6] border-t border-[#CFDBD5] flex items-center justify-between">
            <span className="text-xs text-[#588157] font-medium">
              {statusMessage}
              {errorMessage && <span className="text-[#BC4749]">{errorMessage}</span>}
            </span>
            <button
              type="button"
              disabled={updateSettings.isPending}
              onClick={handleSaveReplenishment}
              className="px-4 py-2 bg-[#242423] hover:bg-[#1A1A19] text-white text-xs font-semibold rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta: Control y auditoría */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Control de vencimientos y auditoría física
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Anticipación de vencimiento */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <label htmlFor="expiry_days" className="text-xs font-semibold text-[#242423] block">
                Anticipación de alertas de vencimiento
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Días de margen para alertar en el inventario antes de que un lote caduque en estantería.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  id="expiry_days"
                  type="number"
                  min="1"
                  max="365"
                  value={expiryAlertDays}
                  onChange={(e) => setExpiryAlertDays(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="30"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
                />
                <span className="text-xs text-[#5A5D5A] shrink-0">días antes</span>
              </div>
            </div>
          </div>

          {/* Conteo a ciegas */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Conteo físico "A ciegas" para colaboradores
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Oculta la existencia teórica del sistema a los empleados que realizan inventarios para evitar copias automáticas.
              </span>
            </div>
            <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
              <button
                type="button"
                role="switch"
                aria-checked={blindPhysicalCount}
                onClick={() => setBlindPhysicalCount(!blindPhysicalCount)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                  blindPhysicalCount ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    blindPhysicalCount ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Pie de tarjeta */}
          <div className="px-5 py-3 bg-[#F7F9F6] border-t border-[#CFDBD5] flex items-center justify-between">
            <span className="text-xs text-[#588157] font-medium">
              {statusMessage}
              {errorMessage && <span className="text-[#BC4749]">{errorMessage}</span>}
            </span>
            <button
              type="button"
              disabled={updateSettings.isPending}
              onClick={handleSaveAudit}
              className="px-4 py-2 bg-[#242423] hover:bg-[#1A1A19] text-white text-xs font-semibold rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
