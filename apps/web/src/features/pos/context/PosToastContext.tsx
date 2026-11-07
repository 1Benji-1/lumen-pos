import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export interface PosToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void
  removeToast: (id: string) => void
  toast: {
    info: (message: string, durationMs?: number) => void
    success: (message: string, durationMs?: number) => void
    warning: (message: string, durationMs?: number) => void
    error: (message: string, durationMs?: number) => void
  }
}

const PosToastContext = createContext<PosToastContextValue | null>(null)

export function PosToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 3800) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, message, type }])

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id)
        }, durationMs)
      }
    },
    [removeToast]
  )

  const toast = useMemo(
    () => ({
      info: (msg: string, d?: number) => showToast(msg, 'info', d),
      success: (msg: string, d?: number) => showToast(msg, 'success', d),
      warning: (msg: string, d?: number) => showToast(msg, 'warning', d),
      error: (msg: string, d?: number) => showToast(msg, 'error', d),
    }),
    [showToast]
  )

  const value = useMemo(
    () => ({ showToast, removeToast, toast }),
    [showToast, removeToast, toast]
  )

  return (
    <PosToastContext.Provider value={value}>
      {children}
      {/* Contenedor flotante de notificaciones no bloqueantes */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
        role="region"
        aria-label="Notificaciones del mostrador"
      >
        {toasts.map((t) => {
          const typeStyles: Record<
            ToastType,
            { bg: string; border: string; text: string; icon: string; iconColor: string }
          > = {
            error: {
              bg: 'bg-white',
              border: 'border-[#BC4749]/40',
              text: 'text-[#242423]',
              icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
              iconColor: 'text-[#BC4749]',
            },
            warning: {
              bg: 'bg-white',
              border: 'border-[#F5CB5C]',
              text: 'text-[#242423]',
              icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
              iconColor: 'text-[#8A6D14]',
            },
            success: {
              bg: 'bg-white',
              border: 'border-[#588157]/40',
              text: 'text-[#242423]',
              icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
              iconColor: 'text-[#588157]',
            },
            info: {
              bg: 'bg-white',
              border: 'border-[#CFDBD5]',
              text: 'text-[#242423]',
              icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              iconColor: 'text-[#335C67]',
            },
          }

          const style = typeStyles[t.type]

          return (
            <div
              key={t.id}
              role="alert"
              aria-live="polite"
              className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg ${style.bg} ${style.border} ${style.text} transition-all duration-200 animate-slide-in`}
            >
              <svg
                className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
              </svg>

              <div className="flex-1 text-xs font-medium leading-relaxed pr-1">{t.message}</div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-md hover:bg-[#E5E5E5] transition shrink-0"
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </PosToastContext.Provider>
  )
}

export function usePosToast() {
  const context = useContext(PosToastContext)
  if (!context) {
    throw new Error('usePosToast debe usarse dentro de un PosToastProvider')
  }
  return context
}
