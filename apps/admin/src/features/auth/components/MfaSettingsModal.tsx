import { useState, useEffect } from 'react'
import {
  enrollMfaTotp,
  challengeAndVerifyMfa,
  unenrollMfaFactor,
  listMfaFactors,
} from '../services/authService'
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal'
import { useToast } from '../../../shared/context/ToastContext'

interface MfaSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onMfaStatusChanged?: () => void
}

export function MfaSettingsModal({
  isOpen,
  onClose,
  onMfaStatusChanged,
}: MfaSettingsModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [activeFactorId, setActiveFactorId] = useState<string | null>(null)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isConfirmUnenrollOpen, setIsConfirmUnenrollOpen] = useState(false)

  const [enrollData, setEnrollData] = useState<{
    id: string
    qrCode: string
    secret: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [copiedSecret, setCopiedSecret] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setEnrollData(null)
      setVerificationCode('')
      setError(null)
      setSuccess(null)
      setIsConfirmUnenrollOpen(false)
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirmUnenrollOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    checkCurrentFactors()

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isConfirmUnenrollOpen, onClose])

  async function checkCurrentFactors() {
    setLoading(true)
    setError(null)
    try {
      const factors = await listMfaFactors()
      const verified = (factors.totp || []).find((f) => f.status === 'verified')
      if (verified) {
        setIsEnrolled(true)
        setActiveFactorId(verified.id)
      } else {
        setIsEnrolled(false)
        setActiveFactorId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar factores de autenticación')
    } finally {
      setLoading(false)
    }
  }

  async function handleStartEnrollment() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await enrollMfaTotp()
      let qr = data.totp.qr_code
      if (qr && qr.startsWith('<svg')) {
        qr = `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`
      }
      setEnrollData({
        id: data.id,
        qrCode: qr,
        secret: data.totp.secret,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar inscripción MFA')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyEnrollment(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollData || verificationCode.length < 6) return

    setLoading(true)
    setError(null)
    try {
      await challengeAndVerifyMfa(enrollData.id, verificationCode)
      setSuccess('Verificación en dos pasos activada exitosamente.')
      toast.success('MFA activado con éxito. Tu cuenta ahora está protegida.')
      setIsEnrolled(true)
      setActiveFactorId(enrollData.id)
      setEnrollData(null)
      setVerificationCode('')
      onMfaStatusChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto. Intenta nuevamente.')
      toast.error('Código MFA inválido. Revisa la hora de tu dispositivo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmUnenroll() {
    if (!activeFactorId) return
    setLoading(true)
    setError(null)
    try {
      await unenrollMfaFactor(activeFactorId)
      setIsEnrolled(false)
      setActiveFactorId(null)
      setIsConfirmUnenrollOpen(false)
      setSuccess('Se ha desvinculado la verificación en dos pasos.')
      toast.warning('Se ha desvinculado el factor de autenticación MFA.')
      onMfaStatusChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desvincular MFA')
      toast.error('No se pudo desvincular el factor MFA.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopySecret() {
    if (!enrollData?.secret) return
    navigator.clipboard.writeText(enrollData.secret)
    setCopiedSecret(true)
    toast.info('Clave secreta copiada al portapapeles.')
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfa-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 id="mfa-settings-title" className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
              Seguridad de Acceso — MFA / TOTP
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Protección en dos pasos para la cuenta de Super Administrador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Cerrar modal de seguridad"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs">
              {success}
            </div>
          )}

          {loading && !enrollData && (
            <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
              Consultando estado de seguridad...
            </div>
          )}

          {!loading && isEnrolled && !enrollData && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs">
                    Verificación en dos pasos activa
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    Tu cuenta está protegida. Cada inicio de sesión requiere tu contraseña y un código dinámico de 6 dígitos generado por tu aplicación autenticadora.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfirmUnenrollOpen(true)}
                  className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-300 dark:border-rose-900/60 transition cursor-pointer"
                >
                  Desvincular autenticador actual
                </button>
              </div>
            </div>
          )}

          {!loading && !isEnrolled && !enrollData && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div>
                  <div className="font-semibold text-amber-800 dark:text-amber-300 text-xs">
                    Verificación en dos pasos no configurada
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    Para blindar el acceso al panel de Super Administrador, vincula una aplicación autenticadora como Google Authenticator, 1Password, Authy o Microsoft Authenticator.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleStartEnrollment}
                  className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition cursor-pointer"
                >
                  Configurar autenticador ahora
                </button>
              </div>
            </div>
          )}

          {enrollData && (
            <form onSubmit={handleVerifyEnrollment} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-zinc-800 dark:text-zinc-300 font-medium">
                  1. Escanea el código con tu aplicación autenticadora
                </p>
                <div className="inline-block p-3 bg-white rounded-xl shadow-lg border border-zinc-200">
                  <img
                    src={enrollData.qrCode}
                    alt="Código QR de autenticación"
                    className="w-44 h-44 mx-auto"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                  <span>O introduce la clave manualmente:</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-zinc-900 dark:text-zinc-100 font-semibold cursor-pointer underline hover:no-underline"
                  >
                    {copiedSecret ? 'Copiada' : 'Copiar clave'}
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-900 dark:text-zinc-200 tracking-wider break-all select-all bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 text-center">
                  {enrollData.secret}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-zinc-800 dark:text-zinc-300 font-medium">
                  2. Introduce el código de 6 dígitos que muestra tu app
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center tracking-widest text-lg font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEnrollData(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Verificando...' : 'Confirmar y activar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmUnenrollOpen}
        onClose={() => setIsConfirmUnenrollOpen(false)}
        onConfirm={handleConfirmUnenroll}
        title="Desvincular Autenticador (MFA)"
        description="¿Estás seguro de desvincular el autenticador? Tu cuenta volverá a requerir únicamente contraseña para ingresar."
        variant="danger"
        confirmText="Desactivar MFA"
        cancelText="Cancelar"
        changes={[
          {
            label: 'Verificación en dos pasos',
            before: 'Activa (TOTP)',
            after: 'Desactivada',
          },
          {
            label: 'Nivel de protección',
            before: 'Contraseña + Código de 6 dígitos',
            after: 'Únicamente contraseña',
          },
        ]}
      />
    </div>
  )
}
