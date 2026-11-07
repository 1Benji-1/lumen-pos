import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
  getCustomerPurchaseHistory,
  checkDuplicateCustomer,
} from '../services/customerService'
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@lumen-pos/types'

export function useCustomers(
  storeId: string | null,
  options?: {
    search?: string
    status?: 'active' | 'inactive' | 'all'
  }
) {
  return useQuery({
    queryKey: ['customers', storeId, options?.status, options?.search],
    queryFn: () => getCustomers(storeId!, options),
    enabled: Boolean(storeId),
  })
}

export function useCreateCustomer(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => {
      if (!storeId) throw new Error('Identificador de tienda no disponible')
      return createCustomer(storeId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
    },
  })
}

export function useUpdateCustomer(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { customerId: string; input: UpdateCustomerInput }) => {
      if (!storeId) throw new Error('Identificador de tienda no disponible')
      return updateCustomer(params.customerId, storeId, params.input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
    },
  })
}

export function useToggleCustomerActive(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { customerId: string; isActive: boolean }) =>
      toggleCustomerActive(params.customerId, params.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', storeId] })
    },
  })
}

export function useCustomerPurchaseHistory(customerId: string | null) {
  return useQuery({
    queryKey: ['customerHistory', customerId],
    queryFn: () => getCustomerPurchaseHistory(customerId!),
    enabled: Boolean(customerId),
  })
}

export function useCheckDuplicateCustomer(storeId: string | null) {
  return useMutation({
    mutationFn: (params: {
      phone?: string | null
      email?: string | null
      excludeCustomerId?: string
    }) => {
      if (!storeId) throw new Error('Identificador de tienda no disponible')
      return checkDuplicateCustomer({ storeId, ...params })
    },
  })
}
