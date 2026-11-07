import { BUSINESS_CATEGORIES, BUSINESS_FAMILIES, BUSINESS_TYPES, RETAIL_SUBTYPES, type BusinessCategoryId, type BusinessType, type RetailSubType } from '@lumen-pos/types'

interface BusinessTypeBadgeProps {
  businessType: BusinessType
  industrySubType?: string | null
  categoryId?: BusinessCategoryId
}

export function BusinessTypeBadge({ businessType, industrySubType, categoryId }: BusinessTypeBadgeProps) {
  const config = BUSINESS_TYPES[businessType]
  const subConfig =
    businessType === 'tienda_articulos' && industrySubType && industrySubType in RETAIL_SUBTYPES
      ? RETAIL_SUBTYPES[industrySubType as RetailSubType]
      : null
  const category = categoryId ? BUSINESS_CATEGORIES[categoryId] : null

  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
        {category ? BUSINESS_FAMILIES[category.familyId].name : config?.name ?? businessType}
      </span>
      {category ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">{category.name}</span> : subConfig && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
          {subConfig.shortName}
        </span>
      )}
    </div>
  )
}
