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
  const subType = profile.familyId === 'retail' && store?.business_type === 'tienda_articulos'
    ? profile.categoryId as RetailSubType
    : 'comercio_general'
  const config = getRetailSubrubroConfig(subType)

  return {
    subType,
    config,
    isLoading: storeIdLoading || storeLoading,
  }
}
