export function StockAlertBadge({
  quantity,
  threshold,
}: {
  quantity: number
  threshold: number
}) {
  if (quantity < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
        Negativo ({quantity})
      </span>
    )
  }

  if (quantity === 0) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
        Agotado
      </span>
    )
  }

  if (quantity <= threshold) {
    return (
      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]">
        Stock bajo
      </span>
    )
  }

  return null
}