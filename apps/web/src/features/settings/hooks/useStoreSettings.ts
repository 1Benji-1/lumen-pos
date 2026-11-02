import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStoreSettings, updateStoreSettings } from '../services/settingsService'
import type { StoreSettings, UpdateStoreSettingsInput } from '@lumen-pos/types'
import { useStoreId } from '../../../shared/hooks/useStoreId'

export function useStoreSettings(explicitStoreId?: string | null) {
  const { storeId: contextStoreId, loading: storeIdLoading } = useStoreId()
  const storeId = explicitStoreId ?? contextStoreId

  const query = useQuery({
    queryKey: ['storeSettings', storeId],
    queryFn: () => getStoreSettings(storeId!),
    enabled: !!storeId && !storeIdLoading,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  })

  return {
    ...query,
    settings: query.data,
    isLoading: storeIdLoading || query.isLoading,
  }
}

export function useUpdateStoreSettings(explicitStoreId?: string | null) {
  const queryClient = useQueryClient()
  const { storeId: contextStoreId } = useStoreId()
  const storeId = explicitStoreId ?? contextStoreId

  return useMutation({
    mutationFn: (input: UpdateStoreSettingsInput) => {
      if (!storeId) throw new Error('No hay ID de tienda')
      return updateStoreSettings(storeId, input)
    },
    onSuccess: (updatedSettings: StoreSettings) => {
      queryClient.setQueryData(['storeSettings', storeId], updatedSettings)
      queryClient.invalidateQueries({ queryKey: ['storeSettings', storeId] })
      queryClient.invalidateQueries({ queryKey: ['storePlan', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
