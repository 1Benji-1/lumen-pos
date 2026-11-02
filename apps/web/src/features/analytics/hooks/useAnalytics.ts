import { useQuery } from '@tanstack/react-query'
import { fetchStoreAnalytics } from '../services/analyticsService'
import { getDateRangeForPeriod } from '../utils/dateRanges'
import type { AnalyticsPeriod } from '@lumen-pos/types'

export function useAnalytics({
  storeId,
  period,
  customStartDate,
  customEndDate,
}: {
  storeId: string | null
  period: AnalyticsPeriod
  customStartDate?: string
  customEndDate?: string
}) {
  const range = getDateRangeForPeriod(period, customStartDate, customEndDate)

  return useQuery({
    queryKey: ['storeAnalytics', storeId, range.startDate, range.endDate],
    queryFn: () =>
      fetchStoreAnalytics({
        storeId: storeId!,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    enabled: !!storeId,
  })
}
