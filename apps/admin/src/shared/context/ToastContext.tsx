import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void
  removeToast: (id: string) => void
  toast: {
    info: (message: string, durationMs?: number) => void
    success: (message: string, durationMs?: number) => void
    warning: (message: string, durationMs?: number) => void
    error: (message: string, durationMs?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
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
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
        role="region"
        aria-label="Notificaciones del sistema"
      >
        {toasts.map((t) => {
          const typeStyles: Record<
            ToastType,
            { border: string; iconColor: string; iconPath: string }
          > = {
            error: {
              border: 'border-rose-300 dark:border-rose-500/40',
              iconColor: 'text-rose-600 dark:text-rose-400',
              iconPath:
                'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            },
            warning: {
              border: 'border-amber-300 dark:border-amber-500/40',
              iconColor: 'text-amber-600 dark:text-amber-400',
              iconPath:
                'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            },
            success: {
              border: 'border-emerald-300 dark:border-emerald-500/40',
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            info: {
              border: 'border-zinc-300 dark:border-zinc-700',
              iconColor: 'text-zinc-700 dark:text-zinc-300',
              iconPath:
                'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            },
          }

          const style = typeStyles[t.type]

          return (
            <div
              key={t.id}
              role="alert"
              aria-live="polite"
              className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md ${style.border} text-zinc-900 dark:text-zinc-100 transition-all duration-200 animate-slide-in`}
            >
              <svg
                className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={style.iconPath}
                />
              </svg>

              <div className="flex-1 text-xs font-medium leading-relaxed pr-1 text-zinc-800 dark:text-zinc-200">
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider')
  }
  return context
}
