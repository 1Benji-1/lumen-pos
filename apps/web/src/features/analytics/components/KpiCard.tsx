import type React from 'react'

export function KpiCard({
  title,
  value,
  subtitle,
  highlight = false,
  badge,
  className = '',
}: {
  title: string
  value: string
  subtitle?: string | React.ReactNode
  highlight?: boolean
  badge?: string
  className?: string
}) {
  return (
    <div
      className={`p-5 rounded-xl border transition shadow-xs flex flex-col justify-between ${
        highlight
          ? 'bg-[#EFF5EE] border-[#BBD2B8] hover:border-[#588157]/60 ring-1 ring-[#588157]/20'
          : 'bg-white border-[#CFDBD5] hover:border-[#242423]/40'
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-xs uppercase tracking-wider text-[#5A5D5A] font-semibold">
            {title}
          </p>
          {badge && (
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold border tabular-nums ${
                highlight
                  ? 'bg-[#588157] text-white border-[#588157]'
                  : 'bg-[#E8EDDF] text-[#242423] border-[#CFDBD5]'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-[#588157]' : 'text-[#242423]'}`}>
          {value}
        </p>
      </div>
      {subtitle && (
        <div className={`text-xs mt-3 font-medium ${highlight ? 'text-[#588157]' : 'text-[#5A5D5A]'}`}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
