import { useEffect } from 'react'
import { CategoryForm } from './CategoryForm'

interface CategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  storeId: string
}

export function CategoriesModal({ isOpen, onClose, storeId }: CategoriesModalProps) {
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 overflow-y-auto animate-modal-backdrop"
    >
      <div className="bg-white border border-[#CFDBD5] rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-panel">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CFDBD5] bg-[#E8EDDF]/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#242423] tracking-tight">Gestionar categorías</h2>
              <p className="text-xs text-[#5A5D5A] mt-0.5">
                Crea nuevas clasificaciones o elimina las vacías.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1">
          <CategoryForm storeId={storeId} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#CFDBD5] bg-[#E8EDDF]/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#242423] bg-white border border-[#CFDBD5] hover:bg-[#E8EDDF] rounded-md transition shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
export default CategoriesModal
