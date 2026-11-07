import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface InventoryLabelsSectionProps {
  settings?: StoreSettings
}

export function InventoryLabelsSection({ settings }: InventoryLabelsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [barcodeLabelSize, setBarcodeLabelSize] = useState<'50x30' | '40x25'>('50x30')
  const [barcodeLabelShowPrice, setBarcodeLabelShowPrice] = useState(true)
  const [barcodeLabelShowStoreName, setBarcodeLabelShowStoreName] = useState(false)

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setBarcodeLabelSize((settings.barcode_label_size as '50x30' | '40x25') || '50x30')
      setBarcodeLabelShowPrice(Boolean(settings.barcode_label_show_price))
      setBarcodeLabelShowStoreName(Boolean(settings.barcode_label_show_store_name))
    }
  }, [settings])

  const handleSave = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        barcode_label_size: barcodeLabelSize,
        barcode_label_show_price: barcodeLabelShowPrice,
        barcode_label_show_store_name: barcodeLabelShowStoreName,
      })
      setStatusMessage('Formatos de etiqueta guardados correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar los formatos')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Tamaño del papel de etiquetas */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="label_size" className="text-xs font-semibold text-[#242423] block">
              Dimensiones del rollo térmico de etiquetas
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Tamaño del papel adhesivo en tu impresora térmica para códigos de barra (milímetros).
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <select
              id="label_size"
              value={barcodeLabelSize}
              onChange={(e) => setBarcodeLabelSize(e.target.value as '50x30' | '40x25')}
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            >
              <option value="50x30">50 mm × 30 mm (Estándar recomendado)</option>
              <option value="40x25">40 mm × 25 mm (Compacto para artículos pequeños)</option>
            </select>
          </div>
        </div>

        {/* Mostrar precio en etiqueta */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Imprimir precio de venta en la etiqueta
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Incluye el precio de venta en la etiqueta adhesiva pegada al producto.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={barcodeLabelShowPrice}
              onClick={() => setBarcodeLabelShowPrice(!barcodeLabelShowPrice)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                barcodeLabelShowPrice ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  barcodeLabelShowPrice ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mostrar nombre de la tienda en etiqueta */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Imprimir nombre de la tienda en la etiqueta
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Incluye el nombre de tu comercio en la cabecera de cada etiqueta adhesiva.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={barcodeLabelShowStoreName}
              onClick={() => setBarcodeLabelShowStoreName(!barcodeLabelShowStoreName)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                barcodeLabelShowStoreName ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  barcodeLabelShowStoreName ? 'translate-x-4' : 'translate-x-0'
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
