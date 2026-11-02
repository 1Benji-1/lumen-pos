import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useStoreId } from '../hooks/useStoreId'
import { useStoreModules } from '../hooks/useStoreModules'
import { useCurrentUserRole } from '../hooks/useCurrentUserRole'
import { useSubmitFeedback } from '../hooks/useFeedback'

type FeedbackView = 'select' | 'issue_hub' | 'issue_form' | 'idea_form' | 'troubleshoot' | 'success'

interface FeedbackPopoverProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackPopover({ isOpen, onClose }: FeedbackPopoverProps) {
  const [view, setView] = useState<FeedbackView>('select')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const location = useLocation()
  const { storeId } = useStoreId()
  const { storeName } = useStoreModules()
  const { role, email } = useCurrentUserRole()
  const submitFeedback = useSubmitFeedback()
  const popoverRef = useRef<HTMLDivElement>(null)

  // Restablecer vista al abrir
  useEffect(() => {
    if (isOpen) {
      setView('select')
      setTitle('')
      setDescription('')
      setErrorMsg(null)
    }
  }, [isOpen])

  // Cerrar al presionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (type: 'issue' | 'idea') => {
    setErrorMsg(null)
    if (!title.trim()) {
      setErrorMsg('Por favor escribe un título o resumen.')
      return
    }
    if (!description.trim()) {
      setErrorMsg('Por favor escribe una descripción.')
      return
    }

    try {
      await submitFeedback.mutateAsync({
        store_id: storeId,
        type,
        title: title.trim(),
        description: description.trim(),
        page_url: location.pathname,
        user_email: email,
        user_role: role,
        store_name: storeName,
      })
      setView('success')
      setTimeout(() => {
        onClose()
      }, 2200)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el mensaje.')
    }
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-[-60px] sm:right-0 top-full mt-2 z-50 w-80 sm:w-96 bg-white border border-[#CFDBD5] rounded-xl shadow-2xl overflow-hidden text-[#242423] select-none animate-in fade-in zoom-in-95 duration-100"
      role="dialog"
      aria-label="Ventana de Feedback y Soporte"
    >
      {/* 1. Vista Selección Inicial (Igual a feedback.png) */}
      {view === 'select' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-[#242423] tracking-tight">
              ¿Qué te gustaría compartir?
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded hover:bg-[#E8EDDF] transition-colors cursor-pointer"
              title="Cerrar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Opción A: Problema */}
            <button
              type="button"
              onClick={() => setView('issue_hub')}
              className="p-4 rounded-lg border border-[#CFDBD5] hover:border-[#BC4749]/60 hover:bg-[#FDF0ED]/50 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer group shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BC4749]"
            >
              <div className="w-8 h-8 rounded-full bg-[#FDF0ED] flex items-center justify-center text-[#BC4749] group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-[#242423] block">
                  Problema
                </span>
                <span className="text-[10px] text-[#5A5D5A] block mt-0.5 leading-tight">
                  Con mi sistema o tienda
                </span>
              </div>
            </button>

            {/* Opción B: Idea */}
            <button
              type="button"
              onClick={() => setView('idea_form')}
              className="p-4 rounded-lg border border-[#CFDBD5] hover:border-[#F5CB5C] hover:bg-[#FEF9E7]/60 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer group shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242423]"
            >
              <div className="w-8 h-8 rounded-full bg-[#FEF9E7] flex items-center justify-center text-[#8A6D14] group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-[#242423] block">
                  Idea de mejora
                </span>
                <span className="text-[10px] text-[#5A5D5A] block mt-0.5 leading-tight">
                  Para potenciar Lumen POS
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. Vista Centro de Soporte y Ayuda (Igual a feedback2.png) */}
      {view === 'issue_hub' && (
        <div>
          <div className="p-4 border-b border-[#CFDBD5] flex items-center justify-between bg-[#E8EDDF]/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('select')}
                className="p-1 text-[#5A5D5A] hover:text-[#242423] hover:bg-white rounded transition cursor-pointer"
                title="Volver"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xs font-bold text-[#242423]">Centro de Soporte</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded hover:bg-white transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-2 divide-y divide-[#CFDBD5]/60">
            {/* Opción 1: WhatsApp */}
            <a
              href="https://wa.me/?text=Hola%2C%20necesito%20asistencia%20t%C3%A9cnica%20en%20Lumen%20POS"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg hover:bg-[#E8EDDF]/50 transition flex items-center justify-between gap-3 group cursor-pointer block"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#EFF5EE] text-[#588157] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#242423] block truncate">
                    Soporte por WhatsApp
                  </span>
                  <span className="text-[11px] text-[#5A5D5A] block truncate">
                    Atención técnica directa para urgencias de mostrador
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#5A5D5A] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Opción 2: Discord & Telegram */}
            <a
              href="https://discord.gg/"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-lg hover:bg-[#E8EDDF]/50 transition flex items-center justify-between gap-3 group cursor-pointer block"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#E8EDDF] text-[#242423] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#242423] block truncate">
                    Comunidad Discord & Telegram
                  </span>
                  <span className="text-[11px] text-[#5A5D5A] block truncate">
                    Canal de soporte y contacto directo con el creador
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#5A5D5A] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Opción 3: Guía rápida */}
            <button
              type="button"
              onClick={() => setView('troubleshoot')}
              className="w-full text-left p-3 rounded-lg hover:bg-[#E8EDDF]/50 transition flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#E8EDDF] text-[#242423] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#242423] block truncate">
                    Guía de soluciones rápidas
                  </span>
                  <span className="text-[11px] text-[#5A5D5A] block truncate">
                    Impresoras térmicas (80/58mm), red y códigos de barra
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#5A5D5A] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Opción 4: Reportar por escrito */}
            <button
              type="button"
              onClick={() => setView('issue_form')}
              className="w-full text-left p-3 rounded-lg hover:bg-[#E8EDDF]/50 transition flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#FDF0ED] text-[#BC4749] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-[#242423] block truncate">
                    Reportar un fallo del sistema
                  </span>
                  <span className="text-[11px] text-[#5A5D5A] block truncate">
                    Documenta un bug para que el equipo lo investigue
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-[#5A5D5A] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Botón inferior al estilo feedback2.png */}
          <div className="p-3 border-t border-[#CFDBD5] bg-[#F7F9F6] text-center">
            <button
              type="button"
              onClick={() => setView('idea_form')}
              className="text-xs font-semibold text-[#5A5D5A] hover:text-[#242423] transition cursor-pointer"
            >
              ¿Tienes una sugerencia? Dejar una idea en su lugar
            </button>
          </div>
        </div>
      )}

      {/* 3. Vista Formulario de Problema Técnico */}
      {view === 'issue_form' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#CFDBD5]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('issue_hub')}
                className="p-1 text-[#5A5D5A] hover:text-[#242423] rounded hover:bg-[#E8EDDF] transition cursor-pointer"
                title="Volver"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xs font-bold text-[#242423]">Reportar fallo del sistema</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded hover:bg-[#E8EDDF] transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="issue_title" className="text-xs font-semibold text-[#242423] block mb-1">
                ¿Qué problema experimentaste?
              </label>
              <input
                id="issue_title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. El ticket se imprime cortado en 58mm"
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423]"
              />
            </div>

            <div>
              <label htmlFor="issue_desc" className="text-xs font-semibold text-[#242423] block mb-1">
                Detalles del error
              </label>
              <textarea
                id="issue_desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explica qué estabas haciendo y si salió algún mensaje..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] resize-none"
              />
            </div>

            <div className="text-[11px] text-[#5A5D5A] bg-[#E8EDDF]/40 p-2.5 rounded border border-[#CFDBD5]/60">
              <span>Se adjuntará automáticamente tu pantalla actual (</span>
              <span className="font-mono text-[#242423]">{location.pathname}</span>
              <span>) y tienda asociada.</span>
            </div>

            {errorMsg && (
              <span className="text-xs text-[#BC4749] block font-medium">
                {errorMsg}
              </span>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('issue_hub')}
                className="px-3 py-1.5 text-xs text-[#5A5D5A] hover:text-[#242423] rounded border border-[#CFDBD5] cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={submitFeedback.isPending}
                onClick={() => handleSubmit('issue')}
                className="px-4 py-1.5 text-xs font-semibold bg-[#242423] hover:bg-[#1A1A19] text-white rounded shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitFeedback.isPending ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Vista Formulario de Idea de Mejora */}
      {view === 'idea_form' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#CFDBD5]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('select')}
                className="p-1 text-[#5A5D5A] hover:text-[#242423] rounded hover:bg-[#E8EDDF] transition cursor-pointer"
                title="Volver"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xs font-bold text-[#242423]">Sugerir idea de mejora</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded hover:bg-[#E8EDDF] transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="idea_title" className="text-xs font-semibold text-[#242423] block mb-1">
                ¿Qué función te gustaría que agreguemos?
              </label>
              <input
                id="idea_title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Enviar ticket de venta por WhatsApp automáticamente"
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423]"
              />
            </div>

            <div>
              <label htmlFor="idea_desc" className="text-xs font-semibold text-[#242423] block mb-1">
                ¿Cómo te imaginas esta mejora?
              </label>
              <textarea
                id="idea_desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe cómo funcionaría y qué beneficio le aportaría a tu comercio..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#CFDBD5] rounded-md text-[#242423] focus:outline-none focus:ring-1 focus:ring-[#242423] focus:border-[#242423] resize-none"
              />
            </div>

            {errorMsg && (
              <span className="text-xs text-[#BC4749] block font-medium">
                {errorMsg}
              </span>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('select')}
                className="px-3 py-1.5 text-xs text-[#5A5D5A] hover:text-[#242423] rounded border border-[#CFDBD5] cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={submitFeedback.isPending}
                onClick={() => handleSubmit('idea')}
                className="px-4 py-1.5 text-xs font-semibold bg-[#242423] hover:bg-[#1A1A19] text-white rounded shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitFeedback.isPending ? 'Enviando...' : 'Enviar propuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Vista Guía de Soluciones Rápidas */}
      {view === 'troubleshoot' && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#CFDBD5]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView('issue_hub')}
                className="p-1 text-[#5A5D5A] hover:text-[#242423] rounded hover:bg-[#E8EDDF] transition cursor-pointer"
                title="Volver"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xs font-bold text-[#242423]">Soluciones Rápidas</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded hover:bg-[#E8EDDF] transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 text-xs text-[#242423]">
            <div className="p-3 bg-[#E8EDDF]/40 rounded border border-[#CFDBD5] space-y-1">
              <span className="font-bold block">1. Impresora térmica corta el texto:</span>
              <p className="text-[11px] text-[#5A5D5A]">
                Ve a Ajustes &gt; Hardware y asegúrate de seleccionar 58mm u 80mm según el ancho exacto del papel de tu impresora.
              </p>
            </div>

            <div className="p-3 bg-[#E8EDDF]/40 rounded border border-[#CFDBD5] space-y-1">
              <span className="font-bold block">2. El lector de código no registra el producto:</span>
              <p className="text-[11px] text-[#5A5D5A]">
                Comprueba que el cursor esté activo en el buscador de la caja y que el teclado del equipo esté en español/inglés sin caracteres especiales.
              </p>
            </div>

            <div className="p-3 bg-[#E8EDDF]/40 rounded border border-[#CFDBD5] space-y-1">
              <span className="font-bold block">3. Sin conexión a internet:</span>
              <p className="text-[11px] text-[#5A5D5A]">
                Lumen POS sigue funcionando en modo offline. Las ventas se guardarán automáticamente en tu equipo y se sincronizarán al volver la red.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Vista Éxito */}
      {view === 'success' && (
        <div className="p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#EFF5EE] text-[#588157] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[#242423]">¡Mensaje enviado con éxito!</h4>
          <p className="text-xs text-[#5A5D5A]">
            Tu comentario ha sido recibido y registrado en el sistema.
          </p>
        </div>
      )}
    </div>
  )
}
