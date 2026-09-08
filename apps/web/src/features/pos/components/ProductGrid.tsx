import { useProducts } from '../../inventory/hooks/useProducts'
import type { CartLine } from '../hooks/useCart'

export function ProductGrid({
  storeId,
  onAddItem,
}: {
  storeId: string
  onAddItem: (item: Omit<CartLine, 'quantity'>) => void
}) {
  const { data: products, isLoading } = useProducts(storeId)

  if (isLoading) return <p className="text-white">Cargando productos...</p>

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products?.flatMap((product) =>
        product.product_variants.map((variant) => (
          <button
            key={variant.id}
            disabled={variant.stock_quantity <= 0}
            onClick={() =>
              onAddItem({
                variantId: variant.id,
                productName: product.name,
                variantName: variant.name,
                unitPrice: variant.sale_price,
                stockAvailable: variant.stock_quantity,
              })
            }
            className="bg-slate-800 text-white rounded p-3 text-left disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
          >
            <p className="font-semibold text-sm">{product.name}</p>
            <p className="text-xs text-slate-400">Bs {variant.sale_price}</p>
            <p className="text-xs text-slate-500">Stock: {variant.stock_quantity}</p>
          </button>
        ))
      )}
    </div>
  )
}