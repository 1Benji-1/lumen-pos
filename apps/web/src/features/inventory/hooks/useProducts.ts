import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProductsWithVariants,
  createProductWithVariant,
  updateVariant,
  deleteProduct,
} from '../services/inventoryService'

export function useProducts(storeId: string | null) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: () => getProductsWithVariants(storeId!),
    enabled: !!storeId,
  })
}

export function useCreateProduct(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Omit<Parameters<typeof createProductWithVariant>[0], 'storeId'>) =>
      createProductWithVariant({ ...params, storeId: storeId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}

export function useUpdateVariant(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateVariant>[1] }) =>
      updateVariant(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}

export function useDeleteProduct(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}