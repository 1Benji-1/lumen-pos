import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from '../../features/auth/services/authService'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'
import { MfaSettingsModal } from '../../features/auth/components/MfaSettingsModal'

export function AdminHeader() {
  const navigate = useNavigate()
  const { session, hasEnrolledMfa, refreshMfaStatus } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    setIsProfileMenuOpen(false)
    try {
      await signOut()
      navigate('/login')
    } catch {
      navigate('/login')
    } finally {
      setIsSigningOut(false)
    }
  }

  const email = session?.user?.email || 'admin@lumen.bo'
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <>
      <header className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sticky top-0 z-40 h-[50px] flex items-center select-none transition-colors duration-150 shadow-xs dark:shadow-md dark:shadow-black/60">
        <div className="w-[50px] h-[50px] flex items-center justify-center shrink-0">
          <Link to="/" title="Ir al Inicio" aria-label="Ir al Inicio" className="flex items-center justify-center">
            <img
              src={theme === 'dark' ? '/logo-2.svg' : '/logo.svg'}
              alt="Lumen POS"
              className="w-[34px] h-[34px] object-contain select-none hover:opacity-85 transition-opacity"
            />
          </Link>
        </div>

        <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0" aria-hidden="true" />

        <div className="pl-3.5 pr-2 flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-bold text-zinc-950 dark:text-white tracking-tight">
            Lumen POS
          </span>
          <span className="text-zinc-400 dark:text-zinc-600 text-xs font-normal" aria-hidden="true">
            -
          </span>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
            Administración
          </span>
        </div>

        <div className="flex items-center gap-2 pr-3 sm:pr-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <svg aria-hidden="true" className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMfaModalOpen(true)}
            className="min-h-[36px] px-2.5 py-1 text-xs rounded-lg transition border flex items-center gap-1.5 cursor-pointer bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
            title="Configurar verificación en dos pasos (TOTP)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                hasEnrolledMfa ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="hidden sm:inline">MFA</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                hasEnrolledMfa
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              }`}
            >
              {hasEnrolledMfa ? 'Activo' : 'Pendiente'}
            </span>
          </button>

          <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0" aria-hidden="true" />

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Menú de Super Administrador"
              className="min-h-[36px] inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer select-none focus:outline-none"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-white shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start text-left leading-tight min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white max-w-[120px] lg:max-w-[160px] truncate">
                  Super Admin
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono leading-none truncate max-w-[120px] lg:max-w-[160px]">
                  {email}
                </span>
              </div>
              <svg
                aria-hidden="true"
                className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180 text-zinc-900 dark:text-white' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProfileMenuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none text-zinc-800 dark:text-zinc-200"
              >
                <div className="px-3.5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-white shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={email}>
                      Super Administrador
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate" title={email}>
                      {email}
                    </span>
                  </div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer min-h-[36px]"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {!hasEnrolledMfa && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-amber-800 dark:text-amber-200">
              Tu cuenta de Super Administrador aún no tiene verificación en dos pasos (MFA). Se recomienda vincular tu autenticador para blindar el panel.
            </span>
            <button
              type="button"
              onClick={() => setIsMfaModalOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold shrink-0 cursor-pointer text-xs"
            >
              Configurar autenticador
            </button>
          </div>
        </div>
      )}

      <MfaSettingsModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        onMfaStatusChanged={refreshMfaStatus}
      />
    </>
  )
}

export default AdminHeader
