import { useState, useEffect } from 'react'
import type { StoreSettings } from '@lumen-pos/types'
import { useUpdateStoreSettings } from '../hooks/useStoreSettings'

interface GeneralSettingsSectionProps {
  settings?: StoreSettings
}

export function GeneralSettingsSection({ settings }: GeneralSettingsSectionProps) {
  const updateSettings = useUpdateStoreSettings()

  const [commercialName, setCommercialName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')

  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setCommercialName(settings.commercial_name || '')
      setLegalName(settings.legal_name || '')
      setTaxId(settings.tax_id || '')
      setPhone(settings.phone || '')
      setAddress(settings.address || '')
      setCity(settings.city || '')
    }
  }, [settings])

  const handleSave = async () => {
    setSaveStatus(null)
    setSaveError(null)
    try {
      await updateSettings.mutateAsync({
        commercial_name: commercialName.trim() || null,
        legal_name: legalName.trim() || null,
        tax_id: taxId.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
      })
      setSaveStatus('Datos del negocio guardados correctamente.')
      setTimeout(() => setSaveStatus(null), 3500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar los datos')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[#CFDBD5] shadow-xs overflow-hidden divide-y divide-[#CFDBD5]">
        {/* Nombre comercial */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="commercial_name" className="text-xs font-semibold text-[#242423] block">
              Nombre comercial
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Nombre público visible en los comprobantes y cabecera del sistema.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="commercial_name"
              type="text"
              value={commercialName}
              onChange={(e) => setCommercialName(e.target.value)}
              placeholder="Ej. Minimarket San Jorge"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* Razón social */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="legal_name" className="text-xs font-semibold text-[#242423] block">
              Razón social
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Nombre legal o societario registrado ante la administración tributaria.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="legal_name"
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Ej. Comercializadora San Jorge S.R.L."
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* NIT / RUC */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="tax_id" className="text-xs font-semibold text-[#242423] block">
              NIT / RUC / Identificación fiscal
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Número de identificación tributaria para comprobantes.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="tax_id"
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Ej. 1028475024"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* Teléfono */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="phone" className="text-xs font-semibold text-[#242423] block">
              Teléfono de contacto
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Teléfono de atención al cliente para pedidos o consultas.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0">
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. +591 70012345"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
          </div>
        </div>

        {/* Dirección y Ciudad */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <label htmlFor="address" className="text-xs font-semibold text-[#242423] block">
              Dirección física y ciudad
            </label>
            <span className="text-xs text-[#5A5D5A] block mt-0.5">
              Ubicación geográfica del local o sucursal comercial.
            </span>
          </div>
          <div className="w-full sm:w-80 shrink-0 space-y-2">
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección (ej. Av. 6 de Agosto #450)"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ciudad (ej. La Paz, Cochabamba, Santa Cruz)"
              className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] transition-colors"
            />
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
