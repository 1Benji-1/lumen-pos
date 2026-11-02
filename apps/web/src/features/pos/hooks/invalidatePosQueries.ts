import type { QueryClient } from '@tanstack/react-query'

/** Shared by checkout, refund and background replay. Prefixes match the readers. */
export async function invalidatePosQueries(queryClient: QueryClient, storeId: string | null) {
  const keys = [
    ['products', storeId], ['sales', storeId], ['stock-movements', storeId],
    ['cashRegister', storeId], ['active-cash-registers', storeId],
    ['dashboard_operational', storeId], ['storeAnalytics', storeId], ['cashAuditAnalytics', storeId],
    ['cashRegisterReport'], ['cashMovements'], ['customerHistory'],
  ]
  await Promise.all(keys.map(queryKey => queryClient.invalidateQueries({ queryKey })))
}
