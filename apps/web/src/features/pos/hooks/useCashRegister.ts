import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOpenCashRegister,
  openCashRegister,
  closeCashRegister,
} from '../services/posService'

export function useOpenCashRegister(storeId: string | null) {
  return useQuery({
    queryKey: ['cashRegister', storeId],
    queryFn: () => getOpenCashRegister(storeId!),
    enabled: !!storeId,
  })
}

export function useOpenRegisterMutation(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; openingAmount: number }) =>
      openCashRegister({ storeId: storeId!, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister', storeId] })
    },
  })
}

export function useCloseRegisterMutation(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: closeCashRegister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegister', storeId] })
    },
  })
}