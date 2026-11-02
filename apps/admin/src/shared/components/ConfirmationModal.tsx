import { useEffect } from 'react'

export interface ChangeItem {
  label: string
  before: string
  after: string
}

export interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  changes?: ChangeItem[]
  confirmText?: string
  cancelText?: string
  isPending?: boolean
  variant?: 'primary' | 'danger'
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  changes,
  confirmText = 'Confirmar cambios',
  cancelText = 'Cancelar',
  isPending = false,
  variant = 'primary',
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isPending, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-3">
          <div>
            <h3 id="confirmation-modal-title" className="text-base font-semibold text-zinc-950 dark:text-white tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer"
            title="Cerrar"
            aria-label="Cerrar modal de confirmación"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {changes && changes.length > 0 && (
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Resumen de modificaciones (Antes → Después)
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/60 divide-y divide-zinc-200 dark:divide-zinc-800">
              <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-950/80 text-xs font-semibold text-zinc-700 dark:text-zinc-400">
                <span>Campo</span>
                <span>Valor actual</span>
                <span>Nuevo valor</span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {changes.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 px-3 py-2.5 text-xs items-center">
                    <span className="font-medium text-zinc-800 dark:text-zinc-300 truncate" title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[11px] truncate" title={item.before}>
                      {item.before}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium text-[11px] truncate" title={item.after}>
                      {item.after}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300/80 dark:hover:bg-zinc-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950'
            }`}
          >
            {isPending ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
