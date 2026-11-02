import { useState } from 'react'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from '../hooks/useCategories'
import type { CategoryWithCount } from '../services/inventoryService'

export function CategoryForm({ storeId }: { storeId: string }) {
  const { data: categories, isLoading } = useCategories(storeId)
  const createCategory = useCreateCategory(storeId)
  const deleteCategory = useDeleteCategory(storeId)

  const [name, setName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setErrorMessage('Ingresa el nombre de la categoría.')
      return
    }

    try {
      await createCategory.mutateAsync(trimmed)
      setName('')
      setSuccessMessage(`Categoría "${trimmed}" creada correctamente.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la categoría.')
    }
  }

  async function handleDelete(category: CategoryWithCount) {
    setErrorMessage(null)
    setSuccessMessage(null)

    // Condición estricta: NO se puede eliminar si tiene productos asignados
    if (category.product_count > 0) {
      setErrorMessage(
        `No se puede eliminar la categoría "${category.name}" porque contiene ${category.product_count} producto(s) asignado(s). Reasigna o desasocia los productos primero desde el catálogo de inventario.`
      )
      return
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`
    )

    if (!confirmDelete) return

    try {
      await deleteCategory.mutateAsync(category.id)
      setSuccessMessage(`Categoría "${category.name}" eliminada correctamente.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar la categoría.')
    }
  }

  const filteredCategories = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  )

  return (
    <div className="space-y-6 text-[#242423]">
      {/* Mensajes de Alerta */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#FDF0ED] border border-[#F0B2B4] text-[#BC4749] text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5 text-[#BC4749]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#BC4749] hover:text-[#9E3B3D] text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-[#EFF5EE] border border-[#BBD2B8] text-[#588157] text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5 text-[#588157]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-[#588157] hover:text-[#3B6B3A] text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario de Nueva Categoría */}
      <div className="bg-[#E8EDDF]/30 p-4 rounded-xl border border-[#CFDBD5] space-y-3">
        <h2 className="text-sm font-bold text-[#242423] tracking-tight">Crear nueva categoría</h2>
        <form onSubmit={handleCreate} className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="text"
            placeholder="Ej. Bebidas, Limpieza, Lácteos..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 min-w-[200px] bg-white border border-[#CFDBD5] rounded-md px-3 py-2 text-sm text-[#242423] placeholder:text-[#5A5D5A] focus:outline-none focus:border-[#242423] transition"
          />
          <button
            type="submit"
            disabled={createCategory.isPending || !name.trim()}
            className="px-4 py-2 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-semibold rounded-md transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 shadow-xs"
          >
            {createCategory.isPending ? 'Guardando...' : 'Agregar categoría'}
          </button>
        </form>
      </div>

      {/* Directorio de Categorías */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[#242423]">Categorías registradas</h3>
            <p className="text-xs text-[#5A5D5A] mt-0.5">
              Solo se pueden eliminar categorías vacías (sin productos asignados).
            </p>
          </div>

          {(categories ?? []).length > 4 && (
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filtrar categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-[#CFDBD5] rounded-md px-2.5 py-1 text-xs text-[#242423] placeholder:text-[#5A5D5A] focus:outline-none focus:border-[#242423] transition w-full sm:w-48"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-[#5A5D5A] py-4">Cargando categorías...</p>
        ) : !categories || categories.length === 0 ? (
          <div className="p-8 rounded-xl bg-white border border-[#CFDBD5] text-center text-[#5A5D5A] text-xs shadow-xs">
            No tienes categorías registradas aún. Agrega la primera arriba.
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-[#CFDBD5] text-center text-[#5A5D5A] text-xs shadow-xs">
            No se encontraron categorías que coincidan con "{searchTerm}".
          </div>
        ) : (
          <div className="border border-[#CFDBD5] rounded-xl overflow-hidden divide-y divide-[#CFDBD5]/40 bg-white shadow-xs">
            {filteredCategories.map((c) => {
              const hasProducts = c.product_count > 0

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 hover:bg-[#E8EDDF]/20 transition gap-4"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-[#242423] block truncate">{c.name}</span>
                    <span className="text-xs text-[#5A5D5A]">
                      {hasProducts ? (
                        <span className="text-[#242423] font-medium">
                          {c.product_count} producto{c.product_count !== 1 ? 's' : ''} asignado{c.product_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[#5A5D5A]">Sin productos asignados</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deleteCategory.isPending}
                      className={`px-2.5 py-1 rounded text-xs transition border flex items-center gap-1.5 ${
                        hasProducts
                          ? 'bg-[#E8EDDF]/50 text-[#5A5D5A] border-[#CFDBD5] cursor-not-allowed'
                          : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4] hover:bg-[#FDF0ED]/80'
                      }`}
                      title={
                        hasProducts
                          ? `No se puede eliminar: tiene ${c.product_count} producto(s) asignado(s)`
                          : 'Eliminar categoría vacía'
                      }
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>{hasProducts ? 'Bloqueada' : 'Eliminar'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
export default CategoryForm