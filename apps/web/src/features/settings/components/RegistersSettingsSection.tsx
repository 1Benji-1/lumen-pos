import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface RegistersSettingsSectionProps {
  settings?: StoreSettings
}

export function RegistersSettingsSection({ settings }: RegistersSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [defaultOpeningCash, setDefaultOpeningCash] = useState<number | ''>(0)
  const [maxCashRegisterHours, setMaxCashRegisterHours] = useState<number | ''>(12)

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setDefaultOpeningCash(settings.default_opening_cash ?? 0)
      setMaxCashRegisterHours(settings.max_cash_register_hours ?? 12)
    }
  }, [settings])

  const handleSave = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        default_opening_cash: Number(defaultOpeningCash) || 0,
        max_cash_register_hours: Number(maxCashRegisterHours) || 0,
      })
      setStatusMessage('Parámetros de caja guardados correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar los parámetros')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Fondo fijo de apertura */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="default_cash" className="text-xs font-semibold text-[#242423] block">
              Fondo fijo sugerido para cambio (Apertura)
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Monto precargado de forma automática en la pantalla al abrir un nuevo turno de caja.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-[#5A5D5A] font-semibold">
                {settings?.currency_symbol || 'Bs'}
              </span>
              <input
                id="default_cash"
                type="number"
                step="any"
                min="0"
                value={defaultOpeningCash}
                onChange={(e) => setDefaultOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Límite de duración de turno */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="max_hours" className="text-xs font-semibold text-[#242423] block">
              Duración máxima de turno de caja
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Horas continuas antes de sugerir al cajero realizar el arqueo y cierre (0 para sin límite).
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <div className="flex items-center gap-2">
              <input
                id="max_hours"
                type="number"
                min="0"
                max="48"
                value={maxCashRegisterHours}
                onChange={(e) => setMaxCashRegisterHours(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="12"
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
              />
              <span className="text-xs text-[#5A5D5A] shrink-0">horas</span>
            </div>
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
