import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { challengeAndVerifyMfa } from '../../features/auth/services/authService'

export function SuperAdminGuard() {
  const {
    session,
    loading,
    isAuthenticated,
    mfaLevel,
    hasEnrolledMfa,
    verifiedFactorId,
    mfaError,
    refreshMfaStatus,
  } = useAuth()

  const [totpCode, setTotpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 text-xs">
        Cargando credenciales de acceso...
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isSuperAdmin = session?.user?.app_metadata?.is_super_admin === true

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md text-center text-zinc-900 dark:text-zinc-100 shadow-xl">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white mb-2">Acceso Denegado</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Esta cuenta no cuenta con privilegios de Super Administrador para operar el panel central.
          </p>
        </div>
      </div>
    )
  }

  if (mfaError || (hasEnrolledMfa && mfaLevel !== 'aal2' && !verifiedFactorId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div role="alert" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md text-center text-zinc-900 dark:text-zinc-100 shadow-xl">
          <h2 className="text-base font-bold mb-2">No se pudo verificar la seguridad de la cuenta</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{mfaError?.message || 'No se encontró un factor compatible para verificar la sesión.'}</p>
          <button type="button" onClick={() => void refreshMfaStatus()} className="px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs cursor-pointer">Reintentar</button>
        </div>
      </div>
    )
  }

  if (hasEnrolledMfa && mfaLevel !== 'aal2') {
    async function handleVerify(e: React.FormEvent) {
      e.preventDefault()
      if (!verifiedFactorId || !totpCode) return
      setVerifying(true)
      setError(null)
      try {
        await challengeAndVerifyMfa(verifiedFactorId, totpCode.trim())
        await refreshMfaStatus()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Código de verificación inválido.')
      } finally {
        setVerifying(false)
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-zinc-900 dark:text-zinc-100 shadow-2xl">
          <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            Lumen POS
          </div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight mb-1">
            Verificación Requerida
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
            Tu cuenta tiene verificación en dos pasos activa. Introduce el código de 6 dígitos de tu aplicación autenticadora para continuar.
          </p>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              autoFocus
              required
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center tracking-widest text-lg font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />

            <button
              type="submit"
              disabled={verifying || totpCode.length < 6}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {verifying ? 'Comprobando código...' : 'Verificar y continuar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <Outlet />
}