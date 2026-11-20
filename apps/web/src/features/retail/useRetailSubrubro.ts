import { useOrganizationId } from '../../core/organizations/useOrganizationId'
import { useOrganizationPlan } from '../../core/subscriptions/useOrganizationPlan'
import { resolveLegacyBusinessProfile } from '@lumen-pos/types'
import {
  getRetailSubrubroConfig,
  type RetailSubType,
  type RetailSubrubroConfig,
} from '@lumen-pos/types'

export function useRetailSubrubro(): {
  subType: RetailSubType
  config: RetailSubrubroConfig
  isLoading: boolean
} {
  const { organizationId: storeId, loading: storeIdLoading } = useOrganizationId()
  const { data: store, isLoading: storeLoading } = useOrganizationPlan(storeId)

  const profile = resolveLegacyBusinessProfile(store?.businessType, store?.industrySubType)
  const config = getRetailSubrubroConfig(
    profile.familyId === 'retail' && store?.businessType === 'tienda_articulos'
      ? profile.categoryId
      : 'comercio_general',
  )
  const subType = config.code

  return {
    subType,
    config,
    isLoading: storeIdLoading || storeLoading,
  }
}
