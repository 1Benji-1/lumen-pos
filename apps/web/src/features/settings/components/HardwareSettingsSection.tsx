import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface HardwareSettingsSectionProps {
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

export function HardwareSettingsSection({ settings }: HardwareSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  // Etiquetas de códigos de barras
  const [barcodeLabelSize, setBarcodeLabelSize] = useState<'50x30' | '40x25'>('50x30')
  const [barcodeLabelShowPrice, setBarcodeLabelShowPrice] = useState(true)
  const [barcodeLabelShowStoreName, setBarcodeLabelShowStoreName] = useState(false)

  // Moneda y zona horaria
  const [currencySymbol, setCurrencySymbol] = useState('Bs')
  const [currencyCode, setCurrencyCode] = useState('BOB')
  const [timezone, setTimezone] = useState('America/La_Paz')

  // Feedback de guardado
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setBarcodeLabelSize((settings.barcode_label_size as '50x30' | '40x25') || '50x30')
      setBarcodeLabelShowPrice(Boolean(settings.barcode_label_show_price))
      setBarcodeLabelShowStoreName(Boolean(settings.barcode_label_show_store_name))
      setCurrencySymbol(settings.currency_symbol || 'Bs')
      setCurrencyCode(settings.currency_code || 'BOB')
      setTimezone(settings.timezone || 'America/La_Paz')
    }
  }, [settings])

  const handleSaveLabels = async () => {
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

  const handleSaveRegional = async () => {
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
    <div className="space-y-10">
      {/* 1. Tarjeta: Etiquetas adhesivas de código de barras */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Etiquetas adhesivas de código de barras
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Tamaño del papel de etiquetas */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <label htmlFor="label_size" className="text-xs font-semibold text-[#242423] block">
                Dimensiones de la etiqueta térmica
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Tamaño del rollo adhesivo utilizado en tu impresora de etiquetas (milímetros).
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
                <option value="40x25">40 mm × 25 mm (Compacto para joyería o accesorios)</option>
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
                Muestra el precio visible al cliente junto al código de barras.
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
                Imprimir nombre del comercio en la etiqueta
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Incluye el nombre de tu tienda en la cabecera de la etiqueta adhesiva.
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
              onClick={handleSaveLabels}
              className="px-4 py-2 bg-[#242423] hover:bg-[#1A1A19] text-white text-xs font-semibold rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta: Moneda y zona horaria */}
      <div>
        <h2 className="text-base font-semibold text-[#242423] mb-3">
          Moneda y zona horaria
        </h2>
        <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
          {/* Moneda rápida */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-md">
              <span className="text-xs font-semibold text-[#242423] block">
                Divisa principal del negocio
              </span>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Símbolo monetario y código bancario utilizados en precios y cálculos.
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

              {/* Botones de sugerencia rápida */}
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
                Zona horaria
              </label>
              <span className="text-xs text-[#5A5D5A] block mt-0.5">
                Asegura que los turnos de caja, ventas y auditorías se registren en la hora local real.
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
              onClick={handleSaveRegional}
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
