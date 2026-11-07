import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../services/purchaseOrderService'

export function usePurchaseOrders(storeId: string | null) {
  return useQuery({
    queryKey: ['purchase-orders', storeId],
    queryFn: () => getPurchaseOrders(storeId!),
    enabled: !!storeId,
  })
}

export function useCreatePurchaseOrder(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Omit<Parameters<typeof createPurchaseOrder>[0], 'storeId'>) =>
      createPurchaseOrder({ ...params, storeId: storeId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
    },
  })
}

export function useReceivePurchaseOrder(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => receivePurchaseOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
    },
  })
}

export function useCancelPurchaseOrder(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => cancelPurchaseOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', storeId] })
    },
  })
}
