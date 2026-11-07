import { useState } from 'react'
import {
  ROLE_DEFINITIONS,
  PERMISSION_CATALOG,
  type UserRole,
} from '@lumen-pos/types'
import { useCreateStaff } from '../hooks/useStaff'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string | null
  isOwner: boolean
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AddStaffModal({ isOpen, onClose, storeId, isOwner }: AddStaffModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('cashier')
  const [setDirectPassword, setSetDirectPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createStaffMutation = useCreateStaff(storeId)

  if (!isOpen) return null

  const availableRoles: UserRole[] = isOwner
    ? ['cashier', 'stock_clerk', 'admin', 'owner']
    : ['cashier', 'stock_clerk']

  const selectedRoleDef = ROLE_DEFINITIONS[role]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    const cleanName = fullName.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Por favor ingrese el nombre completo del colaborador (mínimo 2 caracteres).')
      return
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage('Por favor ingrese una dirección de correo electrónico válida (ej. usuario@comercio.com).')
      return
    }

    if (setDirectPassword && password.trim().length < 6) {
      setErrorMessage('La contraseña provisional debe contener al menos 6 caracteres.')
      return
    }

    try {
      await createStaffMutation.mutateAsync({
        fullName: cleanName,
        email: cleanEmail,
        role,
        password: setDirectPassword ? password.trim() : undefined,
      })
      handleClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al registrar al colaborador.')
    }
  }

  function handleClose() {
    setFullName('')
    setEmail('')
    setRole('cashier')
    setSetDirectPassword(false)
    setPassword('')
    setErrorMessage(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="p-6 border-b border-[#CFDBD5] flex items-center justify-between bg-[#FAFBF9]">
          <div>
            <h2 className="text-base font-bold text-[#242423] tracking-tight">
              Nuevo colaborador
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Asigna el rol y credenciales de acceso para el personal de la tienda.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-[#5A5D5A] hover:text-[#242423] min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer flex items-center justify-center"
            aria-label="Cerrar modal de nuevo colaborador"
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
              Nombre completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder="Ej. Carlos Martínez"
              className="w-full h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] placeholder-[#5A5D5A]/60 focus:outline-none focus:border-[#242423] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242423] mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder="colaborador@empresa.com"
              className="w-full h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] placeholder-[#5A5D5A]/60 focus:outline-none focus:border-[#242423] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#242423] mb-1">
              Rol asignado
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_DEFINITIONS[r].title}
                </option>
              ))}
            </select>
          </div>

          {/* Resumen del rol y permisos otorgados */}
          {selectedRoleDef && (
            <div className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#CFDBD5] text-xs space-y-2">
              <div className="text-[#242423] font-semibold">{selectedRoleDef.description}</div>
              <div className="text-xs text-[#5A5D5A]">
                Permisos incluidos (<span className="tabular-nums font-bold text-[#242423]">{selectedRoleDef.permissions.length}</span>):
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

          {/* Opciones de acceso / contraseña */}
          <div className="pt-3 border-t border-[#CFDBD5] space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl border border-[#CFDBD5] bg-white hover:bg-[#FAFBF9] cursor-pointer transition min-h-[44px]">
              <div>
                <div className="text-xs font-semibold text-[#242423]">Acceso inmediato</div>
                <div className="text-xs text-[#5A5D5A]">
                  Definir contraseña provisional ahora
                </div>
              </div>
              <input
                type="checkbox"
                id="setDirectPassword"
                checked={setDirectPassword}
                onChange={(e) => {
                  setSetDirectPassword(e.target.checked)
                  if (errorMessage) setErrorMessage(null)
                }}
                className="w-4 h-4 rounded border-[#CFDBD5] text-[#242423] focus:ring-[#242423] cursor-pointer"
              />
            </label>

            {setDirectPassword ? (
              <div>
                <label className="block text-xs font-semibold text-[#242423] mb-1">
                  Contraseña provisional
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] placeholder-[#5A5D5A]/60 focus:outline-none focus:border-[#242423] transition"
                />
                <p className="text-xs text-[#5A5D5A] mt-1">
                  El colaborador podrá iniciar sesión de inmediato con este correo y clave.
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#5A5D5A] bg-[#FAFBF9] p-3 rounded-lg border border-[#CFDBD5]/60 leading-relaxed">
                Se enviará una invitación por correo para que el colaborador establezca su propia contraseña de acceso de forma segura.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-[#CFDBD5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white hover:bg-[#FAFBF9] text-[#242423] border border-[#CFDBD5] text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#F5CB5C] hover:bg-[#E5B946] disabled:opacity-50 text-[#242423] text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              {createStaffMutation.isPending ? (
                <>
                  <svg aria-hidden="true" className="w-3.5 h-3.5 animate-spin text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar colaborador</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
