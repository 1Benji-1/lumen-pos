import { useState, useEffect } from 'react'
import {
  useCreateCustomer,
  useUpdateCustomer,
  useCheckDuplicateCustomer,
} from '../hooks/useCustomers'
import type { CustomerWithMetrics, CustomerDuplicateMatch } from '@lumen-pos/types'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  customerToEdit?: CustomerWithMetrics | null
}

export function CustomerModal({
  isOpen,
  onClose,
  storeId,
  customerToEdit,
}: CustomerModalProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [duplicateWarning, setDuplicateWarning] = useState<CustomerDuplicateMatch | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createCustomer = useCreateCustomer(storeId)
  const updateCustomer = useUpdateCustomer(storeId)
  const checkDuplicate = useCheckDuplicateCustomer(storeId)

  const isEditing = Boolean(customerToEdit)

  useEffect(() => {
    if (customerToEdit) {
      setFullName(customerToEdit.full_name || '')
      setPhone(customerToEdit.phone || '')
      setEmail(customerToEdit.email || '')
      setNotes(customerToEdit.notes || '')
      setIsActive(customerToEdit.is_active ?? true)
    } else {
      setFullName('')
      setPhone('')
      setEmail('')
      setNotes('')
      setIsActive(true)
    }
    setDuplicateWarning(null)
    setErrorMessage(null)
  }, [customerToEdit, isOpen])

  if (!isOpen) return null

  async function handleBlurValidation() {
    if (!phone.trim() && !email.trim()) {
      setDuplicateWarning(null)
      return
    }

    try {
      const match = await checkDuplicate.mutateAsync({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        excludeCustomerId: customerToEdit?.id,
      })
      setDuplicateWarning(match)
    } catch {
      // Ignorar errores de red en validación preliminar
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('El nombre del cliente es obligatorio.')
      return
    }

    try {
      // Doble verificación previa de duplicados
      const match = await checkDuplicate.mutateAsync({
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        excludeCustomerId: customerToEdit?.id,
      })

      if (match) {
        setDuplicateWarning(match)
        const reason =
          match.matched_by === 'phone'
            ? `el teléfono ${match.phone}`
            : match.matched_by === 'email'
            ? `el correo ${match.email}`
            : 'el mismo teléfono y correo'
        setErrorMessage(
          `Ya existe un cliente registrado con ${reason}: "${match.full_name}". No se permiten perfiles duplicados.`
        )
        return
      }

      if (isEditing && customerToEdit) {
        await updateCustomer.mutateAsync({
          customerId: customerToEdit.id,
          input: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            notes: notes.trim() || null,
            is_active: isActive,
          },
        })
      } else {
        await createCustomer.mutateAsync({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          is_active: true,
        })
      }

      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al guardar el cliente.')
    }
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending || checkDuplicate.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-[#CFDBD5] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CFDBD5] bg-[#E8EDDF]/40">
          <div>
            <h2 className="text-lg font-bold text-[#242423] tracking-tight">
              {isEditing ? 'Editar cliente' : 'Registrar nuevo cliente'}
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              {isEditing
                ? 'Actualiza los datos o notas de contacto de este cliente.'
                : 'Ingresa los datos para registrar al cliente en tu tienda.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition flex items-center justify-center cursor-pointer"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs flex items-start gap-2">
              <svg aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {duplicateWarning && !errorMessage && (
            <div className="p-3.5 rounded-lg bg-[#FEF9E7] border border-[#F5CB5C]/60 text-[#8A6D14] text-xs flex items-start gap-2">
              <svg aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-[#8A6D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-[#242423]">Coincidencia encontrada:</p>
                <p className="mt-0.5 text-[#5A5D5A]">
                  Ya existe un cliente con este contacto: <strong className="text-[#242423]">{duplicateWarning.full_name}</strong> ({duplicateWarning.phone || duplicateWarning.email}).
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Nombre completo <span className="text-[#BC4749]">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full bg-white border border-[#CFDBD5] rounded-lg px-3 py-2 text-sm text-[#242423] placeholder:text-[#5A5D5A]/50 focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-xs transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setErrorMessage(null)
                }}
                onBlur={handleBlurValidation}
                placeholder="Ej. 70012345"
                className="w-full bg-white border border-[#CFDBD5] rounded-lg px-3 py-2 text-sm text-[#242423] placeholder:text-[#5A5D5A]/50 focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-xs transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrorMessage(null)
                }}
                onBlur={handleBlurValidation}
                placeholder="cliente@ejemplo.com"
                className="w-full bg-white border border-[#CFDBD5] rounded-lg px-3 py-2 text-sm text-[#242423] placeholder:text-[#5A5D5A]/50 focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-xs transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
              Notas u observaciones
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferencias, tallas, direcciones de entrega, alergias, requerimientos especiales..."
              className="w-full bg-white border border-[#CFDBD5] rounded-lg px-3 py-2 text-sm text-[#242423] placeholder:text-[#5A5D5A]/50 focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-xs transition resize-none"
            />
            <p className="text-xs text-[#5A5D5A] mt-1">
              Información útil visible para los cajeros durante las ventas.
            </p>
          </div>

          {isEditing && (
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#242423] bg-white border-[#CFDBD5] focus:ring-[#242423]"
                />
                <span className="text-sm font-medium text-[#242423]">
                  Cliente activo en la tienda
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#CFDBD5] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] px-5 py-2 text-xs font-bold text-[#242423] bg-[#F5CB5C] hover:bg-[#E5B946] active:scale-[0.98] rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
