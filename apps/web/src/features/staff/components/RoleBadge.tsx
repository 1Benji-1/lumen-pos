import { ROLE_DEFINITIONS, type UserRole } from '@lumen-pos/types'

interface RoleBadgeProps {
  role: UserRole | string
  showDescription?: boolean
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-[#242423]/10 text-[#242423] border border-[#242423]/20 font-semibold',
  admin: 'bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8] font-semibold',
  cashier: 'bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/60 font-semibold',
  stock_clerk: 'bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5] font-semibold',
}

export function RoleBadge({ role, showDescription = false }: RoleBadgeProps) {
  const roleDef = ROLE_DEFINITIONS[role as UserRole]
  const badgeStyle =
    ROLE_BADGE_STYLES[role] ??
    roleDef?.badgeColor ??
    'bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5]'

  if (!roleDef) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8EDDF] text-[#5A5D5A] border border-[#CFDBD5]">
        {role}
      </span>
    )
  }

  return (
    <div className="inline-flex flex-col">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${badgeStyle}`}
      >
        {roleDef.title}
      </span>
      {showDescription && (
        <span className="text-xs text-[#5A5D5A] mt-1 max-w-xs leading-normal">
          {roleDef.description}
        </span>
      )}
    </div>
  )
}
