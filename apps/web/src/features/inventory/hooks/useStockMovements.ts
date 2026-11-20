import { useQuery } from '@tanstack/react-query'
import { getStockMovements } from '../services/stockMovementsService'

export function useStockMovements(params: {
  storeId: string | null
  variantId?: string
  type?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
}) {
  return useQuery({
    queryKey: [
      'stock-movements',
      params.storeId,
      params.variantId,
      params.type,
      params.userId,
      params.startDate,
      params.endDate,
      params.limit,
    ],
    queryFn: () =>
      getStockMovements({
        storeId: params.storeId!,
        variantId: params.variantId,
        type: params.type,
        userId: params.userId,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: params.limit,
      }),
    enabled: !!params.storeId,
  })
}
