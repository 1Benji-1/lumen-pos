import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface TicketSettingsSectionProps {
  settings?: StoreSettings
}

export function TicketSettingsSection({ settings }: TicketSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [ticketHeader, setTicketHeader] = useState('')
  const [ticketFooter, setTicketFooter] = useState('')
  const [ticketLegalDisclaimer, setTicketLegalDisclaimer] = useState('')
  const [printCashierName, setPrintCashierName] = useState(false)

  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setTicketHeader(settings.ticket_header || '')
      setTicketFooter(settings.ticket_footer || '')
      setTicketLegalDisclaimer(settings.ticket_legal_disclaimer || '')
      setPrintCashierName(Boolean(settings.print_cashier_name))
    }
  }, [settings])

  const handleSave = async () => {
    setSaveStatus(null)
    setSaveError(null)
    try {
      await updateSettings.mutateAsync({
        ticket_header: ticketHeader.trim() || null,
        ticket_footer: ticketFooter.trim() || '',
        ticket_legal_disclaimer: ticketLegalDisclaimer.trim() || null,
        print_cashier_name: printCashierName,
      })
      setSaveStatus('Configuración de comprobantes guardada correctamente.')
      setTimeout(() => setSaveStatus(null), 3500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar los comprobantes')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Encabezado del ticket */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="ticket_header" className="text-xs font-semibold text-[#242423] block">
              Encabezado de bienvenida
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Lema o mensaje de bienvenida visible al inicio del recibo.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="ticket_header"
              type="text"
              value={ticketHeader}
              onChange={(e) => setTicketHeader(e.target.value)}
              placeholder="Ej. ¡Gracias por elegirnos!"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* Políticas de devolución */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="ticket_footer" className="text-xs font-semibold text-[#242423] block">
              Políticas de cambio y devolución (Pie)
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Términos impresos al final del recibo que protegen al comercio ante reclamos.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <textarea
              id="ticket_footer"
              rows={2}
              value={ticketFooter}
              onChange={(e) => setTicketFooter(e.target.value)}
              placeholder="Ej. Cambios únicamente dentro de las 48 hrs con ticket original."
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Leyenda fiscal */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="ticket_legal" className="text-xs font-semibold text-[#242423] block">
              Leyenda normativa fiscal
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Advertencia o texto tributario obligatorio por la ley de tu país.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="ticket_legal"
              type="text"
              value={ticketLegalDisclaimer}
              onChange={(e) => setTicketLegalDisclaimer(e.target.value)}
              placeholder="Ej. Este documento no otorga derecho a crédito fiscal"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* Imprimir nombre del cajero */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Imprimir nombre del cajero
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Muestra el nombre del colaborador que atendió y cobró la venta en el ticket.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 flex items-center justify-start sm:justify-end">
            <button
              type="button"
              role="switch"
              aria-checked={printCashierName}
              onClick={() => setPrintCashierName(!printCashierName)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[#242423] ${
                printCashierName ? 'bg-[#242423]' : 'bg-[#CFDBD5]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  printCashierName ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Pie de tarjeta */}
        <div className="px-5 py-3 bg-[#F7F9F6] border-t border-[#CFDBD5] flex items-center justify-between">
          <span className="text-xs text-[#588157] font-medium">
            {saveStatus}
            {saveError && <span className="text-[#BC4749]">{saveError}</span>}
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
