import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'
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
  const { storeId, loading: storeIdLoading } = useStoreId()
  const { data: store, isLoading: storeLoading } = useStorePlan(storeId)

  const profile = resolveLegacyBusinessProfile(store?.business_type, store?.industry_sub_type)
  const config = getRetailSubrubroConfig(
    profile.familyId === 'retail' && store?.business_type === 'tienda_articulos'
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
