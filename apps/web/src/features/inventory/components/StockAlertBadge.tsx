export function StockAlertBadge({
  quantity,
  threshold,
}: {
  quantity: number
  threshold: number
}) {
  if (quantity <= 0) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-red-600 text-white">Sin stock</span>
    )
  }

  if (quantity <= threshold) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-yellow-500 text-black">Stock bajo</span>
    )
  }

  return null
}