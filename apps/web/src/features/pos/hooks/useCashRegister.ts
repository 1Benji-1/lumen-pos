import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOpenCashRegister,
  openCashRegister,
  closeCashRegister,
  addCashMovement,
  getCashMovements,
  getCashRegisterReport,
} from '../services/posService'
import type { CashMovementType } from '@lumen-pos/types'

export function useOpenCashRegister(
  storeId: string | null,
  userId?: string,
  allowsMultipleRegisters: boolean = false
) {
  return useQuery({
    queryKey: ['cashRegister', storeId, allowsMultipleRegisters ? userId : 'single'],
    queryFn: () => getOpenCashRegister(storeId!, userId, allowsMultipleRegisters),
    enabled: !!storeId,
    refetchInterval: 10000,
  })
}

export function useOpenRegisterMutation(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      userId: string
      openingAmount: number
      allowsMultipleRegisters?: boolean
    }) => openCashRegister({ storeId: storeId!, ...params }),
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

export function useCashMovements(cashRegisterId: string | null) {
  return useQuery({
    queryKey: ['cashMovements', cashRegisterId],
    queryFn: () => getCashMovements(cashRegisterId!),
    enabled: !!cashRegisterId,
  })
}

export function useAddCashMovementMutation(
  storeId: string | null,
  cashRegisterId: string | null
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      userId: string
      type: CashMovementType
      amount: number
      reason: string
    }) =>
      addCashMovement({
        storeId: storeId!,
        cashRegisterId: cashRegisterId!,
        ...params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashMovements', cashRegisterId] })
      queryClient.invalidateQueries({ queryKey: ['cashRegisterReport', cashRegisterId] })
    },
  })
}

export function useCashRegisterReport(cashRegisterId: string | null) {
  return useQuery({
    queryKey: ['cashRegisterReport', cashRegisterId],
    queryFn: () => getCashRegisterReport(cashRegisterId!),
    enabled: !!cashRegisterId,
  })
}