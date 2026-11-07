import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface RegionalSettingsSectionProps {
  settings?: StoreSettings
}

const COMMON_TIMEZONES = [
  { value: 'America/La_Paz', label: 'Bolivia (La Paz) - GMT-4' },
  { value: 'America/Lima', label: 'Perú (Lima) - GMT-5' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá) - GMT-5' },
  { value: 'America/Santiago', label: 'Chile (Santiago) - GMT-4' },
  { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires) - GMT-3' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo) - GMT-3' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción) - GMT-4' },
  { value: 'America/Guayaquil', label: 'Ecuador (Guayaquil) - GMT-5' },
]

const QUICK_CURRENCIES = [
  { symbol: 'Bs', code: 'BOB', label: 'Boliviano (Bs)' },
  { symbol: '$', code: 'USD', label: 'Dólar estadounidense ($)' },
  { symbol: 'S/.', code: 'PEN', label: 'Sol peruano (S/.)' },
  { symbol: '€', code: 'EUR', label: 'Euro (€)' },
]

export function RegionalSettingsSection({ settings }: RegionalSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [currencySymbol, setCurrencySymbol] = useState('Bs')
  const [currencyCode, setCurrencyCode] = useState('BOB')
  const [timezone, setTimezone] = useState('America/La_Paz')

  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setCurrencySymbol(settings.currency_symbol || 'Bs')
      setCurrencyCode(settings.currency_code || 'BOB')
      setTimezone(settings.timezone || 'America/La_Paz')
    }
  }, [settings])

  const handleSave = async () => {
    setStatusMessage(null)
    setErrorMessage(null)
    try {
      await updateSettings.mutateAsync({
        currency_symbol: currencySymbol.trim() || 'Bs',
        currency_code: currencyCode.trim() || 'BOB',
        timezone: timezone,
      })
      setStatusMessage('Moneda y zona horaria guardadas correctamente.')
      setTimeout(() => setStatusMessage(null), 3500)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar la moneda')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Moneda del negocio */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="text-xs font-semibold text-[#242423] block">
              Moneda principal del negocio
            </span>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Símbolo visual y código ISO utilizados en el cobro, reportes y comprobantes.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="currency_symbol" className="text-[11px] text-[#5A5D5A] block mb-1">
                  Símbolo
                </label>
                <input
                  id="currency_symbol"
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="Bs"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
                />
              </div>
              <div>
                <label htmlFor="currency_code" className="text-[11px] text-[#5A5D5A] block mb-1">
                  Código ISO
                </label>
                <input
                  id="currency_code"
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="BOB"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors uppercase font-mono"
                />
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="flex gap-1.5 flex-wrap pt-1">
              {QUICK_CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrencySymbol(c.symbol)
                    setCurrencyCode(c.code)
                  }}
                  className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                    currencyCode === c.code
                      ? 'bg-[#242423] text-white border-[#242423] font-semibold'
                      : 'bg-white text-[#5A5D5A] border-[#CFDBD5] hover:bg-[#E8EDDF]'
                  }`}
                >
                  {c.symbol} ({c.code})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zona horaria */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="timezone" className="text-xs font-semibold text-[#242423] block">
              Zona horaria local
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Garantiza que la hora de las ventas, cierres y kárdex coincida con la hora de tu ciudad.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
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
