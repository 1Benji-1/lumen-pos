import { useState } from 'react'
import { useStores } from './hooks/useAdminStores'
import { StoresTable } from './components/StoresTable'
import { CreateStoreModal } from './components/CreateStoreModal'

export function StoresPage() {
  const { data: stores = [], isLoading, error } = useStores()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight">Directorio de Comercios</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Supervisión de tiendas, personal, cajas y ciclo de vida de suscripción.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold transition shadow-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Crear tienda nueva</span>
        </button>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center text-xs text-zinc-500 dark:text-zinc-400 shadow-2xs">
          Cargando directorio de comercios...
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300">
          Error al consultar las tiendas: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && <StoresTable stores={stores} />}

      <CreateStoreModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  )
}

export default StoresPage
