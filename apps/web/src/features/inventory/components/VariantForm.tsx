import { useState } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useCreateProduct } from '../hooks/useProducts'

export function VariantForm({ storeId }: { storeId: string }) {
  const { data: categories } = useCategories(storeId)
  const createProduct = useCreateProduct(storeId)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [barcode, setBarcode] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createProduct.mutateAsync({
        name,
        categoryId: categoryId || null,
        variantName: 'Único',
        barcode: barcode || undefined,
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
      })
      setName('')
      setBarcode('')
      setCostPrice('')
      setSalePrice('')
      setStockQuantity('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el producto')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-white max-w-md">
      <h2 className="text-lg font-bold">Nuevo producto</h2>

      <input
        type="text"
        placeholder="Nombre del producto"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded px-3 py-2 text-black"
      />

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="w-full rounded px-3 py-2 text-black"
      >
        <option value="">Sin categoría</option>
        {categories?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Código de barras (o déjalo vacío)"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        className="w-full rounded px-3 py-2 text-black"
      />

      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Costo"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          className="w-full rounded px-3 py-2 text-black"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Precio de venta"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          required
          className="w-full rounded px-3 py-2 text-black"
        />
      </div>

      <input
        type="number"
        placeholder="Stock inicial"
        value={stockQuantity}
        onChange={(e) => setStockQuantity(e.target.value)}
        className="w-full rounded px-3 py-2 text-black"
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={createProduct.isPending}
        className="w-full bg-blue-600 rounded py-2 disabled:opacity-50"
      >
        {createProduct.isPending ? 'Guardando...' : 'Crear producto'}
      </button>
    </form>
  )
}