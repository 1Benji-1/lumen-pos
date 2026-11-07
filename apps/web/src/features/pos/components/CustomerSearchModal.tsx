import { useState, useMemo, useEffect, useRef } from 'react'
import { useCustomers } from '../../../modules/customers'

interface CustomerSearchModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
  selectedCustomerId: string
  onSelectCustomer: (id: string, name?: string, email?: string) => void
  onOpenCreateCustomer: () => void
}

export function CustomerSearchModal({
  isOpen,
  onClose,
  storeId,
  selectedCustomerId,
  onSelectCustomer,
  onOpenCreateCustomer,
}: CustomerSearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: customers = [], isLoading } = useCustomers(storeId, { status: 'active' })

  // Auto-foco en el input al abrir y limpiar término anterior
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Filtrado reactivo en memoria por nombre, teléfono o email
  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const matchName = c.full_name?.toLowerCase().includes(q)
      const matchPhone = c.phone?.toLowerCase().includes(q)
      const matchEmail = c.email?.toLowerCase().includes(q)
      return matchName || matchPhone || matchEmail
    })
  }, [customers, query])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white border border-[#CFDBD5] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Cabecera del modal */}
        <div className="px-5 py-4 border-b border-[#CFDBD5] flex items-center justify-between bg-[#E8EDDF]/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white border border-[#CFDBD5] text-[#242423] shadow-2xs">
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#242423] leading-tight">Buscar cliente</h2>
              <p className="text-xs text-[#5A5D5A]">Selecciona o asigna un cliente a la venta actual</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition"
          >
            ✕
          </button>
        </div>

        {/* Buscador interactivo */}
        <div className="p-4 border-b border-[#CFDBD5] bg-white">
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-[#5A5D5A] pointer-events-none">
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo..."
              className="w-full pl-10 pr-9 py-2.5 text-xs text-[#242423] bg-white border border-[#CFDBD5] rounded-xl placeholder-[#5A5D5A]/70 focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-2xs transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-2.5 text-[#5A5D5A] hover:text-[#242423] p-0.5 rounded transition text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista de clientes scrolleable con acceso directo a Consumidor final */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-[#CFDBD5]/40 max-h-[360px]">
          {/* Opción rápida: Consumidor final */}
          <div className="pb-1.5">
            <button
              type="button"
              onClick={() => {
                onSelectCustomer('', 'Consumidor final', undefined)
                onClose()
              }}
              className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                !selectedCustomerId
                  ? 'bg-[#FEF9E7] border-[#F5CB5C] text-[#8A6D14] shadow-xs'
                  : 'bg-white border-[#CFDBD5]/80 hover:bg-[#E8EDDF]/40 text-[#242423]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E8EDDF] text-[#242423] flex items-center justify-center font-bold text-xs shrink-0">
                  CF
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Consumidor final</div>
                  <span className="text-[11px] text-[#5A5D5A]">Venta regular sin cliente registrado</span>
                </div>
              </div>
              {!selectedCustomerId && (
                <span className="text-xs font-bold text-[#8A6D14] px-2 py-0.5 bg-[#F5CB5C]/30 rounded-full">
                  Asignado
                </span>
              )}
            </button>
          </div>

          {/* Estado de carga */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#5A5D5A]">
              Cargando cartera de clientes...
            </div>
          ) : filteredCustomers.length === 0 ? (
            /* Estado vacío con sugerencia de crear */
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-[#5A5D5A]">
                No se encontró ningún cliente que coincida con &quot;<span className="font-semibold text-[#242423]">{query}</span>&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenCreateCustomer()
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold transition shadow-xs"
              >
                <span>+</span>
                <span>Crear nuevo cliente</span>
              </button>
            </div>
          ) : (
            /* Lista de resultados coincidentes */
            <div className="pt-1.5 space-y-1">
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(customer.id, customer.full_name, customer.email || undefined)
                      onClose()
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#FEF9E7] border-[#F5CB5C] text-[#8A6D14] shadow-xs'
                        : 'bg-white border-transparent hover:border-[#CFDBD5] hover:bg-[#E8EDDF]/40 text-[#242423]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#E8EDDF] text-[#242423] flex items-center justify-center font-bold text-xs shrink-0">
                        {customer.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate leading-tight">
                          {customer.full_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[#5A5D5A]">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <svg aria-hidden="true" className="w-3 h-3 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="truncate max-w-[180px]">
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="text-xs font-bold text-[#8A6D14] px-2 py-0.5 bg-[#F5CB5C]/30 rounded-full shrink-0">
                        Asignado
                      </span>
                    ) : (
                      <span className="text-xs text-[#5A5D5A] group-hover:text-[#242423] font-medium shrink-0">
                        Seleccionar →
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer con acceso a registro rápido */}
        <div className="px-5 py-3 border-t border-[#CFDBD5] bg-[#E8EDDF]/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenCreateCustomer()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#242423] border border-[#CFDBD5] text-xs font-semibold transition shadow-2xs active:scale-[0.98]"
          >
            <span>+</span>
            <span>Registrar cliente nuevo</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#5A5D5A] hover:text-[#242423] border border-[#CFDBD5] text-xs font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
