import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../services/authService'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-white">Recuperar contraseña</h1>

        {sent ? (
          <p className="text-green-400 text-sm">
            Si el correo existe, te enviamos un link para restablecer tu contraseña.
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded px-3 py-2"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
          </>
        )}

        <p className="text-slate-400 text-sm text-center">
          <Link to="/login" className="text-blue-400">
            Volver a iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  )
}