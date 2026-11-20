import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signIn,
  signOut,
  getMfaAssuranceLevel,
  listMfaFactors,
  challengeAndVerifyMfa,
} from '../services/authService'

export function LoginForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [pendingFactorId, setPendingFactorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      const aal = await getMfaAssuranceLevel()
      const factors = await listMfaFactors()
      const verifiedTotp = (factors.totp || []).find((f) => f.status === 'verified')

      if (verifiedTotp && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        setPendingFactorId(verifiedTotp.id)
        setStep('mfa')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!totpCode || totpCode.length < 6) {
      setError('Introduce el código completo de 6 dígitos.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      await challengeAndVerifyMfa(pendingFactorId, totpCode.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código de verificación incorrecto.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelMfa() {
    try {
      await signOut()
    } catch {
    }
    setStep('credentials')
    setTotpCode('')
    setPendingFactorId('')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 transition-colors duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-900 dark:text-zinc-100">
        <div className="mb-6">
          <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-1">
            Lumen POS
          </div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">
            {step === 'credentials' ? 'Super Admin' : 'Verificación en dos pasos'}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            {step === 'credentials'
              ? 'Acceso restringido para administración central de comercios.'
              : 'Introduce el código de 6 dígitos de tu aplicación autenticadora.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="admin@lumenpos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Validando credenciales...' : 'Iniciar sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Código de seguridad (TOTP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center tracking-widest text-lg font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? 'Verificando código...' : 'Verificar y acceder'}
            </button>

            <button
              type="button"
              onClick={handleCancelMfa}
              className="w-full py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-center"
            >
              Volver a ingresar credenciales
            </button>
          </form>
        )}
      </div>
    </div>
  )
}