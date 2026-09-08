import { useProducts, useDeleteProduct } from '../hooks/useProducts'
import { StockAlertBadge } from './StockAlertBadge'

export function ProductTable({ storeId }: { storeId: string }) {
  const { data: products, isLoading } = useProducts(storeId)
  const deleteProduct = useDeleteProduct(storeId)

  if (isLoading) return <p className="text-white">Cargando productos...</p>

  if (!products || products.length === 0) {
    return <p className="text-slate-400">Todavía no hay productos.</p>
  }

  return (
    <table className="w-full text-white text-left mt-6">
      <thead>
        <tr className="border-b border-slate-700">
          <th className="py-2">Producto</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Stock</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) =>
          product.product_variants.map((variant) => (
            <tr key={variant.id} className="border-b border-slate-800">
              <td className="py-2">{product.name}</td>
              <td>{product.categories?.name ?? '—'}</td>
              <td>Bs {variant.sale_price}</td>
              <td className="flex items-center gap-2 py-2">
                {variant.stock_quantity}
                <StockAlertBadge
                  quantity={variant.stock_quantity}
                  threshold={variant.low_stock_threshold}
                />
              </td>
              <td>
                <button
                  onClick={() => deleteProduct.mutate(product.id)}
                  className="text-red-400 text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}