import { useQuery } from '@tanstack/react-query'
import { fetchCashAuditAnalytics } from '../services/analyticsService'
import { getDateRangeForPeriod } from '../utils/dateRanges'
import type { AnalyticsPeriod, CashAuditSummary } from '@lumen-pos/types'

export function useCashAuditAnalytics({
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

  return useQuery<CashAuditSummary>({
    queryKey: ['cashAuditAnalytics', storeId, range.startDate, range.endDate],
    queryFn: () =>
      fetchCashAuditAnalytics({
        storeId: storeId!,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    enabled: !!storeId,
    staleTime: 30 * 1000,
  })
}
