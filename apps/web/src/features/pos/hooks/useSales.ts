import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSales, refundSale, sendDigitalReceipt, getActiveCashRegisters } from '../services/posService'
import { invalidatePosQueries } from './invalidatePosQueries'
import type { SaleStatus } from '@lumen-pos/types'

export function useSales(storeId: string | null, options?: { limit?: number; status?: SaleStatus }) {
  return useQuery({
    queryKey: ['sales', storeId, options?.status, options?.limit],
    queryFn: () => getSales(storeId!, options),
    enabled: !!storeId,
  })
}

export function useActiveCashRegisters(storeId: string | null) {
  return useQuery({
    queryKey: ['active-cash-registers', storeId],
    queryFn: () => getActiveCashRegisters(storeId!),
    enabled: !!storeId,
  })
}

export function useRefundSale(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { saleId: string; reason?: string; disburseCashRegisterId?: string | null }) =>
      refundSale(params),
    onSuccess: () => invalidatePosQueries(queryClient, storeId),
  })
}

export function useSendDigitalReceipt() {
  return useMutation({
    mutationFn: (params: Parameters<typeof sendDigitalReceipt>[0]) =>
      sendDigitalReceipt(params),
  })
}
