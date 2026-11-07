import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { StaffMember } from '@lumen-pos/types'
import { useCheckActiveRegister, useDeleteStaff } from '../hooks/useStaff'

interface DeleteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  member: StaffMember | null
  storeId: string | null
}

export function DeleteStaffModal({
  isOpen,
  onClose,
  member,
  storeId,
}: DeleteStaffModalProps) {
  const [confirmCheckbox, setConfirmCheckbox] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    data: activeRegister,
    isLoading: isCheckingRegister,
  } = useCheckActiveRegister(storeId, member?.id ?? null)

  const deleteStaffMutation = useDeleteStaff(storeId)

  useEffect(() => {
    if (isOpen) {
      setConfirmCheckbox(false)
      setErrorMessage(null)
    }
  }, [isOpen, member])

  if (!isOpen || !member) return null

  const hasActiveRegister = !!activeRegister

  async function handleConfirmDelete() {
    if (!member || hasActiveRegister || !confirmCheckbox) return

    setErrorMessage(null)
    try {
      await deleteStaffMutation.mutateAsync(member.id)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'No fue posible desvincular al colaborador.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Cabecera */}
        <div className="p-6 border-b border-[#CFDBD5] flex items-center justify-between bg-[#FAFBF9]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasActiveRegister
                ? 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/80'
                : 'bg-[#FDF0ED] text-[#BC4749] border border-[#F5C2B8]'
            }`}>
              <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#242423] tracking-tight">
                {hasActiveRegister ? 'Turno de caja activo detectado' : 'Confirmar desvinculación de personal'}
              </h2>
              <p className="text-xs text-[#5A5D5A] mt-0.5">
                {member.full_name || member.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A5D5A] hover:text-[#242423] min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer flex items-center justify-center"
            aria-label="Cerrar modal de desvinculación"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del modal */}
        <div className="p-6 space-y-4">
          {/* Alerta de verificación de caja en carga */}
          {isCheckingRegister && (
            <div className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#CFDBD5] text-xs text-[#5A5D5A] flex items-center gap-2">
              <svg aria-hidden="true" className="w-4 h-4 animate-spin text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Verificando estado de cajas registradoras en curso...</span>
            </div>
          )}

          {/* CASO CRÍTICO: El empleado tiene una caja registradora abierta */}
          {!isCheckingRegister && hasActiveRegister && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#FEF9E7] border border-[#F5CB5C] text-[#8A6D14] text-xs space-y-2 shadow-2xs">
                <div className="font-bold flex items-center gap-1.5 text-sm text-[#8A6D14]">
                  <span>Acción bloqueada: Caja abierta en curso</span>
                </div>
                <p className="leading-relaxed">
                  Este colaborador tiene una caja registradora abierta en este momento en el punto de venta.
                </p>
                <div className="bg-white/80 border border-[#F5CB5C]/60 rounded-lg p-3 space-y-1.5 text-xs text-[#242423]">
                  <div>
                    <span className="font-semibold text-[#5A5D5A]">Hora de apertura: </span>
                    <span className="tabular-nums font-medium">
                      {new Date(activeRegister.opened_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#5A5D5A]">Monto inicial declarado: </span>
                    <span className="tabular-nums font-bold text-[#242423]">
                      Bs {Number(activeRegister.opening_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="leading-relaxed text-xs">
                  Por normas de seguridad operativa y arqueo del dinero físico, <strong>no es posible desvincular a un empleado durante un turno activo</strong>. Primero debes realizar el arqueo y cierre de caja desde la sección de Cajas.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Link
                  to="/pos"
                  onClick={onClose}
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#242423] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <svg aria-hidden="true" className="w-4 h-4 text-[#F5CB5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Ir a Terminal POS</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white border border-[#CFDBD5] hover:bg-[#FAFBF9] text-[#242423] text-xs font-semibold transition cursor-pointer"
                >
                  Entendido, cerrar
                </button>
              </div>
            </div>
          )}

          {/* CASO NORMAL: Sin caja abierta, confirmación de desvinculación */}
          {!isCheckingRegister && !hasActiveRegister && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#FDF0ED] border border-[#F5C2B8] text-[#BC4749] text-xs flex items-start gap-2.5 shadow-2xs">
                  <svg aria-hidden="true" className="w-4 h-4 text-[#BC4749] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#FAFBF9] border border-[#CFDBD5] text-xs space-y-2.5">
                <p className="text-[#242423] font-semibold">
                  ¿Estás seguro de que deseas desvincular a este colaborador?
                </p>
                <ul className="space-y-1.5 text-xs text-[#5A5D5A] list-disc list-inside">
                  <li>
                    <strong className="text-[#242423]">Revocación inmediata:</strong> El colaborador perderá todo acceso al sistema de esta tienda de inmediato.
                  </li>
                  <li>
                    <strong className="text-[#242423]">Historial protegido:</strong> Sus ventas pasadas, notas y reportes se conservarán intactos para auditoría contable.
                  </li>
                  <li>
                    <strong className="text-[#242423]">Liberación de plaza:</strong> Se desocupará una licencia en el plan de tu comercio para incorporar a otro miembro.
                  </li>
                </ul>
              </div>

              {/* Checkbox de confirmación obligatoria con touch target accesible */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#CFDBD5] bg-white hover:bg-[#FAFBF9] cursor-pointer transition min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={confirmCheckbox}
                    onChange={(e) => setConfirmCheckbox(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#CFDBD5] text-[#BC4749] focus:ring-[#BC4749]"
                  />
                  <span className="text-xs text-[#242423] leading-snug">
                    Confirmo que deseo desvincular definitivamente a <strong>{member.full_name || member.email}</strong> y revocar todos sus accesos operativos.
                  </span>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-[#CFDBD5] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={deleteStaffMutation.isPending}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white border border-[#CFDBD5] hover:bg-[#FAFBF9] text-[#242423] text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={!confirmCheckbox || deleteStaffMutation.isPending}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#BC4749] hover:bg-[#9A3839] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {deleteStaffMutation.isPending ? (
                    <>
                      <svg aria-hidden="true" className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Desvinculando...</span>
                    </>
                  ) : (
                    <span>Desvincular colaborador</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
