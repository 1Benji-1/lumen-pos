import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface PosSettingsSectionProps {
  settings?: StoreSettings
}

export function PosSettingsSection({ settings }: PosSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [allowNegativeStock, setAllowNegativeStock] = useState(false)
  const [requireCustomerForSale, setRequireCustomerForSale] = useState(false)
  const [autoPrintTicket, setAutoPrintTicket] = useState(true)

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setAllowNegativeStock(Boolean(settings.allow_negative_stock))
      setRequireCustomerForSale(Boolean(settings.require_customer_for_sale))
      setAutoPrintTicket(Boolean(settings.auto_print_ticket))
    }
  }, [settings])

  const handleSave = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        allow_negative_stock: allowNegativeStock,
        require_customer_for_sale: requireCustomerForSale,
        auto_print_ticket: autoPrintTicket,
      })
      setStatusMessage('Reglas de mostrador guardadas correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar las reglas')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Venta con stock negativo */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Permitir venta con stock en cero o negativo
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Permite cobrar productos en caja aunque el encargado no haya registrado aún la compra en el sistema.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={allowNegativeStock}
              onClick={() => setAllowNegativeStock(!allowNegativeStock)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                allowNegativeStock ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  allowNegativeStock ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Exigir cliente obligatorio */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Exigir cliente obligatorio para cobrar
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Obliga al cajero a asignar un cliente registrado o con documento antes de procesar el cobro.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={requireCustomerForSale}
              onClick={() => setRequireCustomerForSale(!requireCustomerForSale)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                requireCustomerForSale ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  requireCustomerForSale ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Impresión automática de ticket */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Impresión automática de ticket al cobrar
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Dispara el cuadro de impresión térmica de forma automática en cuanto se confirma el pago de la venta.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={autoPrintTicket}
              onClick={() => setAutoPrintTicket(!autoPrintTicket)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                autoPrintTicket ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  autoPrintTicket ? 'translate-x-4' : 'translate-x-0'
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
