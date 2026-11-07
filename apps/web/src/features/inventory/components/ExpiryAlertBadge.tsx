export function ExpiryAlertBadge({ expiryDate }: { expiryDate: string | null | undefined }) {
  if (!expiryDate) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const exp = new Date(expiryDate)
  const diffTime = exp.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#BC4749] border border-[#F0B2B4]">
        Vencido
      </span>
    )
  }

  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]">
        Vence en {diffDays} d
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF5EE] text-[#3B6B3A] border border-[#BBD2B8]">
      Vigente
    </span>
  )
}
