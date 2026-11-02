import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOpenRegisterMutation } from '../hooks/useCashRegister'
import { CashMovementModal } from './CashMovementModal'
import { CorteXModal } from './CorteXModal'
import { CloseRegisterModal } from './CloseRegisterModal'
import type { CashMovementType } from '@lumen-pos/types'
import { useStoreSettings } from '../../settings/hooks/useStoreSettings'
import { useCurrentUserRole } from '../../../shared/hooks/useCurrentUserRole'

export function OpenRegisterForm({
  storeId,
  userId,
  allowsMultipleRegisters = false,
}: {
  storeId: string
  userId: string
  allowsMultipleRegisters?: boolean
}) {
  const { hasPermission, loading: roleLoading } = useCurrentUserRole()
  const { settings } = useStoreSettings(storeId)
  const openRegister = useOpenRegisterMutation(storeId)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings?.default_opening_cash !== undefined && settings?.default_opening_cash !== null && amount === '') {
      setAmount(String(settings.default_opening_cash))
    }
  }, [settings?.default_opening_cash])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await openRegister.mutateAsync({
        userId,
        openingAmount: Number(amount) || 0,
        allowsMultipleRegisters,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir la caja')
    }
  }

  return (
    <div className="py-6 sm:py-10 flex flex-col items-center justify-center px-4 w-full">
      <div className="max-w-md w-full bg-white border border-[#CFDBD5] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50 shrink-0">
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#242423]">Apertura de turno de caja</h2>
            <p className="text-[#5A5D5A] text-xs mt-1 leading-relaxed">
              Esta terminal no tiene un turno de caja activo. Para realizar cobros y ventas en mostrador, ingresa el fondo inicial de efectivo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1.5">
              Monto inicial en gaveta ({settings?.currency_symbol || 'Bs'})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#5A5D5A]">
                {settings?.currency_symbol || 'Bs'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-[#CFDBD5] pl-11 pr-3.5 py-2.5 text-[#242423] bg-white text-sm font-mono tabular-nums focus:outline-none focus:border-[#242423] focus:ring-1 focus:ring-[#242423] shadow-xs"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={openRegister.isPending}
            className="w-full min-h-[44px] bg-[#F5CB5C] hover:bg-[#E5B946] active:scale-[0.99] text-[#242423] font-bold rounded-lg py-2.5 px-4 text-xs transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {openRegister.isPending ? (
              <span>Abriendo caja...</span>
            ) : (
              <>
                <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Iniciar turno de caja</span>
              </>
            )}
          </button>
        </form>

        {/* Accesos directos de supervisión y auditoría (solo para roles con permiso de auditoría) */}
        {!roleLoading && hasPermission('pos:audit_cash') && (
          <div className="pt-4 border-t border-[#CFDBD5] space-y-3">
            <p className="text-xs font-medium text-[#5A5D5A] text-center">
              ¿Deseas auditar o supervisar sin abrir una caja física?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                to="/analytics?tab=cash_audit"
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#242423] bg-[#E8EDDF]/50 hover:bg-[#E8EDDF] border border-[#CFDBD5] rounded-lg transition min-h-[44px] text-center"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Auditoría de Cajas</span>
              </Link>
              <Link
                to="/pos/ventas"
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#242423] bg-[#E8EDDF]/50 hover:bg-[#E8EDDF] border border-[#CFDBD5] rounded-lg transition min-h-[44px] text-center"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-[#5A5D5A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Historial de Ventas</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CloseRegisterAction({
  storeId,
  cashRegisterId,
  storeName,
  className = '',
}: {
  storeId: string
  cashRegisterId: string
  storeName: string
  className?: string
}) {
  const [showCloseModal, setShowCloseModal] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setShowCloseModal(true)}
        className={`px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4] hover:border-[#BC4749] rounded-md transition shadow-2xs flex items-center gap-1.5 shrink-0 active:scale-[0.98] ${className}`.trim()}
        title="Cerrar turno de caja y realizar arqueo"
        aria-label="Cerrar turno de caja y realizar arqueo"
      >
        <svg className="w-3.5 h-3.5 text-[#BC4749]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Cerrar caja</span>
      </button>

      {showCloseModal && (
        <CloseRegisterModal
          storeId={storeId}
          cashRegisterId={cashRegisterId}
          storeName={storeName}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </>
  )
}

export function CashMovementActions({
  storeId,
  cashRegisterId,
  userId,
  storeName,
  className = '',
}: {
  storeId: string
  cashRegisterId: string
  userId: string
  storeName: string
  className?: string
}) {
  const { hasPermission, loading: roleLoading } = useCurrentUserRole()
  const [movementModalType, setMovementModalType] = useState<CashMovementType | null>(null)
  const [showCorteX, setShowCorteX] = useState(false)

  const canAuditCash = !roleLoading && hasPermission('pos:audit_cash')

  return (
    <>
      <div
        className={`inline-flex items-center bg-white border border-[#CFDBD5] rounded-md p-0.5 shadow-2xs ${className}`.trim()}
        role="group"
        aria-label="Operaciones de efectivo en gaveta"
      >
        <button
          type="button"
          onClick={() => setMovementModalType('in')}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#242423] hover:bg-[#E8EDDF] rounded transition active:scale-[0.98]"
          title="Registrar ingreso de efectivo a caja"
          aria-label="Registrar ingreso de efectivo"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center text-[#588157] font-bold text-xs leading-none">+</span>
          <span>Ingreso</span>
        </button>

        <div className="w-px h-3.5 bg-[#CFDBD5]" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setMovementModalType('out')}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#242423] hover:bg-[#E8EDDF] rounded transition active:scale-[0.98]"
          title="Registrar retiro / sangría de efectivo"
          aria-label="Registrar retiro de efectivo"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center text-[#BC4749] font-bold text-xs leading-none">−</span>
          <span>Retiro</span>
        </button>

        {canAuditCash && (
          <>
            <div className="w-px h-3.5 bg-[#CFDBD5]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setShowCorteX(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#242423] hover:bg-[#E8EDDF] rounded transition active:scale-[0.98]"
              title="Generar lectura parcial de caja (Corte X)"
              aria-label="Generar reporte de Corte X"
            >
              <svg className="w-3.5 h-3.5 text-[#8A6D14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Corte X</span>
            </button>
          </>
        )}
      </div>

      {movementModalType && (
        <CashMovementModal
          storeId={storeId}
          cashRegisterId={cashRegisterId}
          userId={userId}
          initialType={movementModalType}
          onClose={() => setMovementModalType(null)}
        />
      )}

      {showCorteX && (
        <CorteXModal
          cashRegisterId={cashRegisterId}
          storeName={storeName}
          onClose={() => setShowCorteX(false)}
        />
      )}
    </>
  )
}

export function CashRegisterActions({
  storeId,
  cashRegisterId,
  userId,
  storeName,
}: {
  storeId: string
  cashRegisterId: string
  userId: string
  storeName: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CashMovementActions
        storeId={storeId}
        cashRegisterId={cashRegisterId}
        userId={userId}
        storeName={storeName}
      />
      <CloseRegisterAction
        storeId={storeId}
        cashRegisterId={cashRegisterId}
        storeName={storeName}
      />
    </div>
  )
}