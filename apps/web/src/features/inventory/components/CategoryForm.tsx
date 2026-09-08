import { useState } from 'react'
import { useCategories, useCreateCategory } from '../hooks/useCategories'

export function CategoryForm({ storeId }: { storeId: string }) {
  const { data: categories } = useCategories(storeId)
  const createCategory = useCreateCategory(storeId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createCategory.mutateAsync(name)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la categoría')
    }
  }

  return (
    <div className="text-white max-w-md space-y-3 mb-8">
      <h2 className="text-lg font-bold">Categorías</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva categoría"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="flex-1 rounded px-3 py-2 text-black"
        />
        <button
          type="submit"
          disabled={createCategory.isPending}
          className="bg-blue-600 rounded px-4 disabled:opacity-50"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <ul className="text-sm text-slate-300 space-y-1">
        {categories?.map((c) => (
          <li key={c.id}>• {c.name}</li>
        ))}
      </ul>
    </div>
  )
}