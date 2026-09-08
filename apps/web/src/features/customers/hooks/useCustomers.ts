import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  createCustomer,
  getCustomerPurchaseHistory,
} from '../services/customerService'

export function useCustomers(storeId: string | null) {
  return useQuery({
    queryKey: ['customers', storeId],
    queryFn: () => getCustomers(storeId!),
    enabled: !!storeId,
  })
}

export function useCreateCustomer(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { full_name: string; phone?: string; email?: string }) =>
      createCustomer({ ...input, store_id: storeId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
    },
  })
}

export function useCustomerPurchaseHistory(customerId: string | null) {
  return useQuery({
    queryKey: ['customerHistory', customerId],
    queryFn: () => getCustomerPurchaseHistory(customerId!),
    enabled: !!customerId,
  })
}