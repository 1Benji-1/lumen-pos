import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getDashboardOperationalData } from '../services/dashboardService'
import type { DashboardOperationalData, TopProductsPeriod } from '@lumen-pos/types'

export function useDashboardData(storeId: string | null, period: TopProductsPeriod = 'today') {
  return useQuery<DashboardOperationalData>({
    queryKey: ['dashboard_operational', storeId, period],
    queryFn: () => {
      if (!storeId) throw new Error('Identificador de tienda no disponible')
      return getDashboardOperationalData(storeId, period)
    },
    enabled: Boolean(storeId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  })
}
