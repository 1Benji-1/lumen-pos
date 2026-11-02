import { useState, useEffect } from 'react'
import { useCustomers, useCreateCustomer } from '../../customers/hooks/useCustomers'

interface QuickCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  onCustomerCreated: (customer: { id: string; full_name: string; email?: string | null }) => void
}

export function QuickCustomerModal({
  isOpen,
  onClose,
  storeId,
  onCustomerCreated,
}: QuickCustomerModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duplicateMatch, setDuplicateMatch] = useState<{
    id: string
    full_name: string
    email?: string | null
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const { data: customers } = useCustomers(storeId, { status: 'active' })
  const createCustomer = useCreateCustomer(storeId)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDuplicateMatch(null)

    const cleanPhone = phone.trim()
    const cleanEmail = email.trim().toLowerCase()

    // Comprobación de duplicados
    const existing = customers?.find((c) => {
      if (cleanPhone && c.phone && c.phone.trim() === cleanPhone) return true
      if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) return true
      return false
    })

    if (existing) {
      setDuplicateMatch({
        id: existing.id,
        full_name: existing.full_name,
        email: existing.email,
      })
      setError(`Ya existe un cliente con esos datos: "${existing.full_name}".`)
      return
    }

    try {
      const created = await createCustomer.mutateAsync({
        full_name: name.trim(),
        phone: cleanPhone || undefined,
        email: cleanEmail || undefined,
      })
      onCustomerCreated({
        id: created.id,
        full_name: created.full_name,
        email: created.email,
      })
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Error al registrar cliente.')
    }
  }

  function handleClose() {
    setName('')
    setPhone('')
    setEmail('')
    setError(null)
    setDuplicateMatch(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/60">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-[#242423] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#CFDBD5] bg-[#E8EDDF]/50">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h3 className="text-sm font-bold tracking-tight text-[#242423]">Registrar cliente rápido</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E5E5E5] transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-[#242423] mb-1">
              Nombre completo <span className="text-[#BC4749]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Juan Pérez"
              aria-label="Nombre completo del cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#CFDBD5] rounded-xl px-3 py-2 text-[#242423] placeholder:text-[#5A5D5A]/60 focus:outline-none focus:border-[#F5CB5C] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#242423] mb-1">
                Teléfono
              </label>
              <input
                type="text"
                placeholder="Ej. 70012345"
                aria-label="Teléfono del cliente"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-[#CFDBD5] rounded-xl px-3 py-2 text-[#242423] placeholder:text-[#5A5D5A]/60 focus:outline-none focus:border-[#F5CB5C] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#242423] mb-1">
                Correo (opcional)
              </label>
              <input
                type="email"
                placeholder="juan@ejemplo.com"
                aria-label="Correo electrónico del cliente"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#CFDBD5] rounded-xl px-3 py-2 text-[#242423] placeholder:text-[#5A5D5A]/60 focus:outline-none focus:border-[#F5CB5C] transition"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[#BC4749] text-xs space-y-1">
              <p>{error}</p>
              {duplicateMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onCustomerCreated({
                      id: duplicateMatch.id,
                      full_name: duplicateMatch.full_name,
                      email: duplicateMatch.email,
                    })
                    handleClose()
                  }}
                  className="underline font-bold text-[#242423] hover:text-[#BC4749] block text-left pt-0.5"
                >
                  Asignar a {duplicateMatch.full_name} a la venta actual →
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#CFDBD5]">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#242423] hover:bg-[#CFDBD5] bg-[#E5E5E5] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending || !name.trim()}
              className="px-4 py-1.5 rounded-xl bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {createCustomer.isPending ? 'Guardando...' : 'Guardar y asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
