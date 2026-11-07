import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, formatAuthError } from '../services/authService'

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
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#E8EDDF] text-[#242423] selection:bg-[#F5CB5C]/40">
      {/* 1. Panel izquierdo angosto: Formulario de recuperación en Soft Linen */}
      <div className="w-full md:w-[42%] lg:w-[40%] xl:w-[38%] min-h-screen flex flex-col px-6 sm:px-10 md:px-10 lg:px-14 py-8 sm:py-10 bg-[#E8EDDF] shrink-0">
        {/* Cabecera con logo-line.png */}
        <div className="flex items-center">
          <img
            src="/logo-line.png"
            alt="Lumen"
            className="h-10 sm:h-11 w-auto object-contain"
          />
        </div>

        {/* Formulario minimalista centrado verticalmente */}
        <div className="max-w-[360px] w-full mx-auto my-auto py-8">
          <div className="space-y-1.5 mb-6">
            <h1 className="text-2xl font-bold text-[#242423] tracking-tight">
              ¿Olvidaste tu contraseña?
            </h1>
            <p className="text-xs text-[#5A5D5A] leading-relaxed">
              Ingresa el correo registrado para recibir un enlace seguro de restablecimiento.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div
                role="status"
                aria-live="polite"
                className="p-4 rounded-xl bg-[#EFF5EE] border border-[#BBD2B8] text-[#588157] text-xs space-y-2 shadow-2xs animate-in fade-in duration-150"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Enlace enviado</span>
                </div>
                <p className="text-[#242423] leading-relaxed">
                  Si existe una cuenta asociada a <strong className="font-semibold text-[#242423]">{email}</strong>, recibirás un correo con instrucciones para definir tu nueva contraseña.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-white hover:bg-[#F8F9FA] border border-[#CFDBD5] text-[#242423] text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#242423]/20"
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-[#242423]"
                >
                  Correo electrónico
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={loading}
                  placeholder="operador@comercio.com"
                  className="w-full min-h-[44px] rounded-lg bg-transparent border border-[#CFDBD5] hover:border-[#242423]/30 px-3.5 py-2.5 text-sm text-[#242423] placeholder-[#8A8E8A] transition-colors focus:outline-none focus:border-[#242423] focus:ring-2 focus:ring-[#242423]/15 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3.5 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-150"
                >
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="leading-relaxed font-medium">{error}</span>
                </div>
              )}

              {/* Botón blanco con sombra */}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-white hover:bg-[#F8F9FA] active:scale-[0.99] border border-[#CFDBD5] text-[#242423] text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#242423]/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <svg
                      aria-hidden="true"
                      className="animate-spin h-4 w-4 text-[#242423]"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enviando enlace...</span>
                  </>
                ) : (
                  <span>Enviar enlace de recuperación</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="min-h-[44px] inline-flex items-center justify-center text-xs font-semibold text-[#5A5D5A] hover:text-[#242423] hover:underline underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40 rounded-md px-3"
                >
                  ← Volver a iniciar sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2. Panel derecho: Solo la imagen /login.jpeg a pantalla completa sin elementos superpuestos */}
      <div className="hidden md:block md:flex-1 relative h-screen bg-[#242423]">
        <img
          src="/login.jpeg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center select-none"
        />
      </div>
    </div>
  )
}