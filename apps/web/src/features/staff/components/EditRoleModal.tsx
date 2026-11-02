import { useState, useEffect } from 'react'
import {
  ROLE_DEFINITIONS,
  PERMISSION_CATALOG,
  type StaffMember,
  type UserRole,
} from '@lumen-pos/types'
import { useUpdateStaffRole } from '../hooks/useStaff'

interface EditRoleModalProps {
  isOpen: boolean
  onClose: () => void
  member: StaffMember | null
  storeId: string | null
  isOwner: boolean
}

export function EditRoleModal({
  isOpen,
  onClose,
  member,
  storeId,
  isOwner,
}: EditRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('cashier')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateRoleMutation = useUpdateStaffRole(storeId)

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role)
    }
  }, [member])

  if (!isOpen || !member) return null

  const availableRoles: UserRole[] = isOwner
    ? ['cashier', 'stock_clerk', 'admin', 'owner']
    : ['cashier', 'stock_clerk']

  const selectedRoleDef = ROLE_DEFINITIONS[selectedRole]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    if (!member) return

    try {
      await updateRoleMutation.mutateAsync({
        userId: member.id,
        role: selectedRole,
      })
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'No fue posible actualizar el rol.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-6 border-b border-[#CFDBD5] flex items-center justify-between bg-[#FAFBF9]">
          <div>
            <h2 className="text-base font-bold text-[#242423] tracking-tight">
              Modificar rol de acceso
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">{member.full_name || member.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A5D5A] hover:text-[#242423] min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer flex items-center justify-center"
            aria-label="Cerrar modal de modificación de rol"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FDF0ED] border border-[#F5C2B8] text-[#BC4749] text-xs flex items-start gap-2.5 shadow-2xs">
              <svg aria-hidden="true" className="w-4 h-4 text-[#BC4749] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#242423] mb-1">
              Seleccionar nuevo rol
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_DEFINITIONS[r].title}
                </option>
              ))}
            </select>
          </div>

          {selectedRoleDef && (
            <div className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#CFDBD5] text-xs space-y-2">
              <div className="text-[#242423] font-semibold">{selectedRoleDef.description}</div>
              <div className="text-xs text-[#5A5D5A]">
                Permisos asociados (<span className="tabular-nums font-bold text-[#242423]">{selectedRoleDef.permissions.length}</span>):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedRoleDef.permissions.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-[#242423] border border-[#CFDBD5] font-medium"
                  >
                    {PERMISSION_CATALOG[p]?.name ?? p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#CFDBD5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white hover:bg-[#FAFBF9] text-[#242423] border border-[#CFDBD5] text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateRoleMutation.isPending}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#F5CB5C] hover:bg-[#E5B946] disabled:opacity-50 text-[#242423] text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              {updateRoleMutation.isPending ? (
                <>
                  <svg aria-hidden="true" className="w-3.5 h-3.5 animate-spin text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Actualizar rol</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
