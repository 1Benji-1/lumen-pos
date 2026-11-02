import { useStoreId } from './useStoreId'
import { useStorePlan } from './useStorePlan'
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

  const subType = (store?.industry_sub_type as RetailSubType) || 'comercio_general'
  const config = getRetailSubrubroConfig(subType)

  return {
    subType,
    config,
    isLoading: storeIdLoading || storeLoading,
  }
}
