import { useState, useMemo, useEffect } from 'react'
import type { AppFeedback, FeedbackStatus, FeedbackType } from '@lumen-pos/types'
import { useAdminFeedback, useUpdateAdminFeedbackStatus } from './hooks/useAdminFeedback'

export function FeedbackDashboardPage() {
  const { data: feedbackList = [], isLoading, error } = useAdminFeedback()
  const updateStatusMutation = useUpdateAdminFeedbackStatus()

  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<AppFeedback | null>(null)
  const [adminNotesInput, setAdminNotesInput] = useState('')
  const [selectedStatusInput, setSelectedStatusInput] = useState<FeedbackStatus>('pending')

  useEffect(() => {
    if (!selectedItem) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedItem(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItem])

  const filteredList = useMemo(() => {
    return feedbackList.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = item.title?.toLowerCase().includes(query)
        const matchDesc = item.description?.toLowerCase().includes(query)
        const matchStore = item.store_name?.toLowerCase().includes(query)
        const matchEmail = item.user_email?.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchStore && !matchEmail) return false
      }
      return true
    })
  }, [feedbackList, typeFilter, statusFilter, searchQuery])

  const totalCount = feedbackList.length
  const issuesCount = feedbackList.filter((f) => f.type === 'issue').length
  const ideasCount = feedbackList.filter((f) => f.type === 'idea').length
  const pendingCount = feedbackList.filter((f) => f.status === 'pending').length

  const handleOpenDetail = (item: AppFeedback) => {
    setSelectedItem(item)
    setSelectedStatusInput(item.status)
    setAdminNotesInput(item.admin_notes || '')
  }

  const handleSaveModal = async () => {
    if (!selectedItem) return
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedItem.id,
        status: selectedStatusInput,
        adminNotes: adminNotesInput.trim() || null,
      })
      setSelectedItem(null)
    } catch (err) {
      console.error('Error guardando cambios:', err)
    }
  }

  const handleQuickStatusChange = async (item: AppFeedback, newStatus: FeedbackStatus) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: item.id,
        status: newStatus,
        adminNotes: item.admin_notes,
      })
    } catch (err) {
      console.error('Error actualizando estado:', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">Feedback y Soporte</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Buzón centralizado de problemas técnicos e ideas de mejora enviadas por comercios y usuarios.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total mensajes</div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-white mt-1">{totalCount}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Tickets registrados</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pendientes de atención</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Requieren revisión</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Problemas técnicos</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{issuesCount}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Reportes de error o bug</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Propuestas de mejora</div>
            <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-200 mt-1">{ideasCount}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Nuevas características sugeridas</div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('issue')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'issue'
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80 shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Problemas ({issuesCount})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('idea')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'idea'
                    ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Ideas ({ideasCount})
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="in_review">En revisión</option>
              <option value="resolved">Resueltos</option>
              <option value="dismissed">Descartados</option>
            </select>
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              placeholder="Buscar por comercio, correo o texto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 pl-8 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
            />
            <svg
              className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Cargando mensajes de feedback...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-xs text-rose-600 dark:text-rose-400">
              Error al cargar feedback: {error instanceof Error ? error.message : 'Error desconocido'}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No se encontraron registros con los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 uppercase text-xs tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Fecha</th>
                    <th scope="col" className="px-4 py-3">Tipo</th>
                    <th scope="col" className="px-4 py-3">Título / Asunto</th>
                    <th scope="col" className="px-4 py-3">Comercio</th>
                    <th scope="col" className="px-4 py-3">Usuario</th>
                    <th scope="col" className="px-4 py-3">Pantalla</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                  {filteredList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition-colors group"
                    >
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {new Date(item.created_at).toLocaleTimeString('es-BO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.type === 'issue' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60">
                            Problema
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60">
                            Idea
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 max-w-[280px]">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate" title={item.title}>
                          {item.title}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate mt-0.5" title={item.description}>
                          {item.description}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-zinc-900 dark:text-zinc-200 block">
                          {item.store_name || 'Sin nombre'}
                        </span>
                        {item.store_id && (
                          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 block truncate max-w-[120px]" title={item.store_id}>
                            {item.store_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-zinc-800 dark:text-zinc-300 block">
                          {item.user_email || 'Anónimo'}
                        </span>
                        {item.user_role && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                            {item.user_role}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                          {item.page_url || '/'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item, e.target.value as FeedbackStatus)}
                          disabled={updateStatusMutation.isPending}
                          className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="in_review">En revisión</option>
                          <option value="resolved">Resuelto</option>
                          <option value="dismissed">Descartado</option>
                        </select>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="px-2.5 py-1 text-xs rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-ticket-modal-title"
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'issue' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80">
                    Problema técnico
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/80">
                    Idea de mejora
                  </span>
                )}
                <h3 id="feedback-ticket-modal-title" className="text-sm font-bold text-zinc-950 dark:text-white">Detalle del Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Cerrar modal"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Asunto / Título:</span>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white mt-0.5 bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
                  {selectedItem.title}
                </p>
              </div>

              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Descripción completa:</span>
                <p className="text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap mt-0.5 bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Comercio</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">{selectedItem.store_name || 'N/A'}</span>
                  <span className="block font-mono text-[11px] text-zinc-400 dark:text-zinc-500 truncate" title={selectedItem.store_id || ''}>
                    {selectedItem.store_id || 'Sin store_id'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Usuario remitente</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-200">{selectedItem.user_email || 'N/A'}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">Rol: {selectedItem.user_role || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Pantalla de origen</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{selectedItem.page_url || '/'}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Fecha de recepción</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{new Date(selectedItem.created_at).toLocaleString('es-BO')}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label htmlFor="modal_status" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Estado del ticket:
                  </label>
                  <select
                    id="modal_status"
                    value={selectedStatusInput}
                    onChange={(e) => setSelectedStatusInput(e.target.value as FeedbackStatus)}
                    className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-200 rounded px-2.5 py-1 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_review">En revisión</option>
                    <option value="resolved">Resuelto</option>
                    <option value="dismissed">Descartado</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal_notes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Notas internas del administrador:
                  </label>
                  <textarea
                    id="modal_notes"
                    rows={2}
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                    placeholder="Escribe notas internas (ej. Corregido en commit abc, contactado por WhatsApp...)"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={handleSaveModal}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {updateStatusMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
