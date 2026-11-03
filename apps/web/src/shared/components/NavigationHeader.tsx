import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ROLE_DEFINITIONS, type UserRole } from '@lumen-pos/types'
import { useStoreId } from '../hooks/useStoreId'
import { useStoreModules } from '../hooks/useStoreModules'
import { useStoreEntitlements } from '../hooks/useStoreEntitlements'
import { useCurrentUserRole } from '../hooks/useCurrentUserRole'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { signOut } from '../../features/auth/services/authService'
import { useOnlineStatus } from '../../features/pos/hooks/useOnlineStatus'
import { useOpenCashRegister } from '../../features/pos/hooks/useCashRegister'
import { useAutoSyncOffline } from '../../features/pos/hooks/useAutoSyncOffline'
import { supabase } from '../lib/supabaseClient'
import { FeedbackPopover } from './FeedbackPopover'

export function NavigationHeader() {
  const { storeId } = useStoreId()
  const { storeName, planName } = useStoreModules()
  const { role, fullName, email } = useCurrentUserRole()
  const { session } = useAuth()
  const { isFeatureEnabled } = useStoreEntitlements()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const isDocs = location.pathname.startsWith('/docs')

  const [docsSearchInput, setDocsSearchInput] = useState(searchParams.get('q') || '')

  // Mantener sincronizado el input con el query param 'q' si cambia externamente
  useEffect(() => {
    if (!isDocs) return
    const currentQ = searchParams.get('q') || ''
    if (currentQ !== docsSearchInput) {
      setDocsSearchInput(currentQ)
    }
  }, [searchParams, isDocs])

  // Debounce de 250ms para sincronizar el input con searchParams sin saturar el historial
  useEffect(() => {
    if (!isDocs) return
    const timer = setTimeout(() => {
      const currentParam = searchParams.get('q') || ''
      const trimmed = docsSearchInput.trim()
      if (currentParam !== trimmed) {
        setSearchParams((prev) => {
          const nextParams = new URLSearchParams(prev)
          if (trimmed) {
            nextParams.set('q', trimmed)
          } else {
            nextParams.delete('q')
          }
          return nextParams
        }, { replace: true })
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [docsSearchInput, isDocs, searchParams, setSearchParams])

  // 1. Estado reactivo de caja registradora: considera multi-caja según plan
  const allowsMultipleRegisters = isFeatureEnabled('multiple_cash_registers')

  const { data: openRegister } = useOpenCashRegister(
    storeId,
    session?.user?.id,
    allowsMultipleRegisters
  )
  const isRegisterOpen = Boolean(openRegister)

  // Suscripción en tiempo real a cambios en cash_registers vía Supabase Realtime
  useEffect(() => {
    if (!storeId) return

    const channel = supabase
      .channel(`cash-registers-header-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_registers',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cashRegister', storeId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, queryClient])

  // 2. Sincronización automática de ventas offline en segundo plano
  const { isSyncing, offlineCount } = useAutoSyncOffline(storeId)

  // 3. Popover de feedback y soporte
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const feedbackRef = useRef<HTMLDivElement>(null)

  // 4. Menú desplegable de perfil de usuario y Cerrar sesión
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false)
      }
      if (feedbackRef.current && !feedbackRef.current.contains(target)) {
        setIsFeedbackOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
        setIsFeedbackOpen(false)
      }
    }
    if (isProfileMenuOpen || isFeedbackOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileMenuOpen, isFeedbackOpen])

  const handleSignOut = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    setIsProfileMenuOpen(false)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
      window.location.assign('/login')
    } finally {
      setIsSigningOut(false)
    }
  }

  // Datos de usuario y rol
  const roleDef = role ? ROLE_DEFINITIONS[role as UserRole] : null
  const roleTitle =
    roleDef?.title ??
    (role === 'owner'
      ? 'Propietario'
      : role === 'admin'
      ? 'Encargado'
      : role === 'cashier'
      ? 'Cajero'
      : 'Personal')

  const displayName = fullName || email?.split('@')[0] || 'Usuario'
  const initials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : displayName.slice(0, 2).toUpperCase()

  return (
    <header className="bg-[#E8EDDF] border-b border-[#CFDBD5] text-[#242423] sticky top-0 z-40 h-[50px] flex items-center select-none">
      {/* 1. Caja 50px x 50px para el logo SVG: alineada sobre el sidebar de 50px (INMUTABLE) */}
      <div className="w-[50px] h-[50px] flex items-center justify-center shrink-0">
        <Link to="/" title="Ir al Inicio" aria-label="Ir al Inicio" className="flex items-center justify-center">
          <img
            src="/logo.svg"
            alt="Logo"
            className="w-[34px] h-[34px] object-contain select-none hover:opacity-85 transition-opacity"
          />
        </Link>
      </div>

      {/* Línea divisoria vertical sutil entre logo y nombre */}
      <div className="h-5 w-[1px] bg-[#CFDBD5] shrink-0" aria-hidden="true" />

      {/* Nombre completo de la tienda destacado en cápsula de superficie blanca y badge de plan contratado */}
      <div className="pl-3.5 pr-2 flex items-center gap-2.5 min-w-0">
        <div className="px-2.5 py-1 rounded-lg bg-white border border-[#CFDBD5] shadow-2xs flex items-center min-w-0">
          <span
            className="text-sm sm:text-base font-bold text-[#242423] tracking-tight truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px] select-text"
            title={storeName || 'Mi comercio'}
          >
            {storeName || 'Cargando comercio...'}
          </span>
        </div>
        {planName && (
          <span
            className="shrink-0 text-[10px] font-bold text-[#8A6D14] bg-[#FEF9E7] border border-[#F5CB5C]/60 px-2 py-0.5 rounded-full shadow-2xs select-none hidden sm:inline"
            title={`Plan contratado: ${planName}`}
          >
            {planName.replace(/^plan\s+/i, '')}
          </span>
        )}
        {isDocs && (
          <span className="shrink-0 text-xs font-bold text-[#242423] bg-white border border-[#CFDBD5] px-2 py-0.5 rounded-md shadow-2xs select-none">
            Docs
          </span>
        )}
      </div>

      {/* 2. Lado derecho: Modo Documentación vs Modo Operativo Regular */}
      {isDocs ? (
        <>
          {/* Buscador interactivo de la documentación en la barra superior */}
          <div className="flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-6 min-w-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={docsSearchInput}
                onChange={(e) => setDocsSearchInput(e.target.value)}
                placeholder="Buscar en la documentación..."
                aria-label="Buscar en la documentación"
                className="w-full min-h-[44px] bg-white border border-[#CFDBD5] rounded-lg px-3 py-2 pl-9 pr-10 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#F5CB5C] focus:ring-2 focus:ring-[#F5CB5C]/40 transition-colors shadow-2xs"
              />
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5 text-[#5A5D5A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {/* Botón de limpieza rápida (×) */}
              {docsSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setDocsSearchInput('')
                    setSearchParams((prev) => {
                      const nextParams = new URLSearchParams(prev)
                      nextParams.delete('q')
                      return nextParams
                    }, { replace: true })
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-md text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                >
                  <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Botón único Dashboard en lugar de los widgets regulares */}
          <div className="pr-4 sm:pr-6 flex items-center justify-end">
            <Link
              to="/"
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#E5E5E5] hover:bg-[#CFDBD5] border border-[#CFDBD5] text-[#242423] text-xs font-semibold shadow-2xs transition active:scale-[0.98] flex items-center gap-2 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
              aria-label="Volver a Inicio / Dashboard"
              title="Volver a Inicio / Dashboard"
            >
              <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </Link>
          </div>
        </>
      ) : (
        <div className="flex-1 px-4 sm:px-6 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          {/* A. Indicador de conectividad (En línea: Verde Salvia / Sincronizando: Ámbar / Sin conexión: Terracota) */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs select-none min-h-[32px] ${
              !isOnline
                ? 'bg-[#FDF0ED] border-[#F0B2B4] text-[#BC4749]'
                : isSyncing
                ? 'bg-[#FEF9E7] border-[#F5CB5C]/60 text-[#8A6D14]'
                : 'bg-white border-[#CFDBD5] text-[#242423]'
            }`}
            title={
              !isOnline
                ? `Sin conexión a internet · ${offlineCount} venta(s) guardada(s) localmente`
                : isSyncing
                ? `Sincronizando automáticamente ${offlineCount} venta(s) con la nube...`
                : offlineCount > 0
                ? `En línea · ${offlineCount} venta(s) pendiente(s) de sincronizar`
                : 'Conectado a la nube de Lumen POS'
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                !isOnline
                  ? 'bg-[#BC4749] animate-pulse'
                  : isSyncing
                  ? 'bg-[#F5CB5C] animate-ping'
                  : 'bg-[#588157]'
              }`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {!isOnline
                ? 'Sin conexión'
                : isSyncing
                ? 'Sincronizando...'
                : 'En línea'}
            </span>
            {offlineCount > 0 && (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-[#F5CB5C] text-[#242423] border border-[#E5B946] tabular-nums"
                title={isSyncing ? `Sincronizando ${offlineCount} venta(s)` : `${offlineCount} venta(s) guardada(s) localmente`}
              >
                {offlineCount}
              </span>
            )}
          </div>

          {/* B. Indicador de estado de caja (Caja abierta: Verde Salvia) */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-2xs select-none min-h-[32px] ${
              isRegisterOpen
                ? 'bg-white border-[#CFDBD5] text-[#242423]'
                : 'bg-white/80 border-[#CFDBD5] text-[#5A5D5A]'
            }`}
            title={
              isRegisterOpen
                ? 'Caja registradora abierta y operativa'
                : 'No hay turno de caja abierto en esta estación'
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isRegisterOpen ? 'bg-[#588157]' : 'bg-[#5A5D5A]/40'
              }`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {isRegisterOpen ? 'Caja abierta' : 'Caja cerrada'}
            </span>
          </div>

          {/* Botón y Popover de Feedback */}
          <div className="relative" ref={feedbackRef}>
            <button
              type="button"
              onClick={() => {
                setIsFeedbackOpen((prev) => !prev)
                setIsProfileMenuOpen(false)
              }}
              aria-expanded={isFeedbackOpen}
              aria-haspopup="dialog"
              aria-label="Feedback y sugerencias"
              className={`h-8 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/50 flex items-center justify-center ${
                isFeedbackOpen
                  ? 'bg-white text-[#242423] border-[#CFDBD5] shadow-xs'
                  : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-white/80 border-transparent hover:border-[#CFDBD5]'
              }`}
              title="Feedback y sugerencias"
            >
              Feedback
            </button>

            <FeedbackPopover
              isOpen={isFeedbackOpen}
              onClose={() => setIsFeedbackOpen(false)}
            />
          </div>

          {/* C. Ícono de ayuda con enlace directo a /docs */}
          <Link
            to="/docs"
            aria-label="Documentación del sistema"
            title="Documentación y manuales del sistema"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-[#242423] hover:text-[#1A1A19] hover:bg-[#CFDBD5]/30 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </Link>

          {/* D. Perfil con menú desplegable y Cerrar sesión */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen((prev) => !prev)
              }}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label={`Menú de usuario: ${displayName}, Rol: ${roleTitle}`}
              title={fullName ? `${fullName} (${roleTitle})` : roleTitle}
              className="min-w-[44px] min-h-[44px] inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-md text-[#242423] hover:bg-[#CFDBD5]/30 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
            >
              <div className="w-7 h-7 rounded-full bg-white border border-[#CFDBD5] flex items-center justify-center text-xs font-bold text-[#242423] shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="hidden md:flex flex-col items-start text-left leading-tight min-w-0">
                <span className="text-xs font-semibold text-[#242423] max-w-[110px] lg:max-w-[150px] truncate">
                  {displayName}
                </span>
                <span className="text-xs text-[#242423]/75 font-medium leading-none">
                  {roleTitle}
                </span>
              </div>
              <svg
                aria-hidden="true"
                className={`w-3.5 h-3.5 text-[#5A5D5A] transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180 text-[#242423]' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menú desplegable flotante */}
            {isProfileMenuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#CFDBD5] rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 select-none text-[#242423]"
              >
                {/* Encabezado informativo del usuario */}
                <div className="px-3.5 py-2.5 border-b border-[#CFDBD5]/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#E8EDDF] border border-[#CFDBD5] flex items-center justify-center text-xs font-bold text-[#242423] shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-xs font-semibold text-[#242423] truncate" title={displayName}>
                      {displayName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-medium text-[#8A6D14]">
                        {roleTitle}
                      </span>
                      {email && (
                        <>
                          <span className="text-[#CFDBD5]" aria-hidden="true">·</span>
                          <span className="text-xs text-[#5A5D5A] truncate max-w-[110px]" title={email}>
                            {email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acción: Cerrar sesión */}
                <div className="p-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[#BC4749] hover:bg-[#FDF0ED] transition-colors cursor-pointer min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-[#BC4749] shrink-0"
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
      )}
    </header>
  )
}

export default NavigationHeader
