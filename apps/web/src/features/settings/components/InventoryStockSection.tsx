import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface InventoryStockSectionProps {
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

export function InventoryStockSection({ settings }: InventoryStockSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number | ''>(5)
  const [defaultProductUnit, setDefaultProductUnit] = useState('u')

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setDefaultLowStockThreshold(settings.default_low_stock_threshold ?? 5)
      setDefaultProductUnit(settings.default_product_unit || 'u')
    }
  }, [settings])

  const handleSave = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        default_low_stock_threshold: Number(defaultLowStockThreshold) || 0,
        default_product_unit: defaultProductUnit,
      })
      setStatusMessage('Parámetros de existencias guardados correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar los parámetros')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Umbral global de stock mínimo */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="low_stock" className="text-xs font-semibold text-[#242423] block">
              Umbral global de stock mínimo
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Cantidad límite por defecto para alertar sobre stock crítico en el catálogo y compras.
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

        {/* Unidad de medida predeterminada */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="default_unit" className="text-xs font-semibold text-[#242423] block">
              Unidad de medida predeterminada
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Unidad que vendrá preseleccionada al registrar nuevos artículos en el catálogo.
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

        {/* Pie de tarjeta */}
        <div className="px-5 py-3 bg-[#F7F9F6] border-t border-[#CFDBD5] flex items-center justify-between">
          <span className="text-xs text-[#588157] font-medium">
            {statusMessage}
            {errorMessage && <span className="text-[#BC4749]">{errorMessage}</span>}
          </span>
          <button
            type="button"
            disabled={updateSettings.isPending}
            onClick={handleSave}
            className="px-4 py-2 bg-[#242423] hover:bg-[#1A1A19] text-white text-xs font-semibold rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
