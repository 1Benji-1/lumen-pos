import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrganizationSettings, updateOrganizationSettings } from './organizationSettingsRepository'
import type { StoreSettings, UpdateStoreSettingsInput } from '@lumen-pos/types'
import { useOrganizationId } from '../organizations/useOrganizationId'

export function useOrganizationSettings(explicitOrganizationId?: string | null) {
  const { organizationId: contextOrganizationId, loading: organizationIdLoading } = useOrganizationId()
  const organizationId = explicitOrganizationId ?? contextOrganizationId

  const query = useQuery({
    queryKey: ['storeSettings', organizationId],
    queryFn: () => getOrganizationSettings(organizationId!),
    enabled: !!organizationId && !organizationIdLoading,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
  })

  return {
    ...query,
    settings: query.data,
    isLoading: organizationIdLoading || query.isLoading,
  }
}

export function useUpdateOrganizationSettings(explicitOrganizationId?: string | null) {
  const queryClient = useQueryClient()
  const { organizationId: contextOrganizationId } = useOrganizationId()
  const organizationId = explicitOrganizationId ?? contextOrganizationId

  return useMutation({
    mutationFn: (input: UpdateStoreSettingsInput) => {
      if (!organizationId) throw new Error('No hay ID de organización')
      return updateOrganizationSettings(organizationId, input)
    },
    onSuccess: (updatedSettings: StoreSettings) => {
      queryClient.setQueryData(['storeSettings', organizationId], updatedSettings)
      queryClient.invalidateQueries({ queryKey: ['storeSettings', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['storePlan', organizationId] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
