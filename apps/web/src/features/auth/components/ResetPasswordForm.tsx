import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { updatePassword, formatAuthError } from '../services/authService'
import { supabase } from '../../../shared/lib/supabaseClient'
import { type UserRole, getDefaultRouteForRole } from '@lumen-pos/types'

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifique ambos campos.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      // Redirigir según el rol del usuario autenticado para evitar rebote de permisos
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        const targetRoute = getDefaultRouteForRole(userData?.role as UserRole)
        navigate(targetRoute, { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#E8EDDF] text-[#242423] selection:bg-[#F5CB5C]/40">
      {/* 1. Panel izquierdo angosto: Formulario de restablecimiento en Soft Linen */}
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
              Define tu nueva contraseña
            </h1>
            <p className="text-xs text-[#5A5D5A] leading-relaxed">
              Crea una contraseña segura de al menos 6 caracteres para acceder al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-password"
                className="block text-xs font-semibold text-[#242423]"
              >
                Nueva contraseña
              </label>
              <div className="relative flex items-center">
                <input
                  id="reset-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  autoComplete="new-password"
                  disabled={loading}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full min-h-[44px] rounded-lg bg-transparent border border-[#CFDBD5] hover:border-[#242423]/30 px-3.5 py-2.5 pr-11 text-sm text-[#242423] placeholder-[#8A8E8A] transition-colors focus:outline-none focus:border-[#242423] focus:ring-2 focus:ring-[#242423]/15 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-md text-[#5A5D5A] hover:text-[#242423] hover:bg-[#242423]/5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#242423]/20"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? (
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-semibold text-[#242423]"
              >
                Confirmar nueva contraseña
              </label>
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                disabled={loading}
                placeholder="Repite la contraseña"
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
                  <span>Guardando contraseña...</span>
                </>
              ) : (
                <span>Guardar nueva contraseña</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="min-h-[44px] inline-flex items-center justify-center text-xs font-semibold text-[#5A5D5A] hover:text-[#242423] hover:underline underline-offset-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40 rounded-md px-3"
              >
                ← Cancelar y volver al inicio
              </Link>
            </div>
          </form>
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