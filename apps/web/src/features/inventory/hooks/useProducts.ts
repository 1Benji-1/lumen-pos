import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProductsWithVariants,
  createProductWithVariant,
  updateVariant,
  deleteProduct,
  toggleProductActive,
  assignInternalBarcode,
  adjustVariantStock,
  batchUpdatePrices,
  updateProductWithVariant,
} from '../services/inventoryService'

export function useProducts(
  storeId: string | null,
  options?: { includeInactive?: boolean }
) {
  return useQuery({
    queryKey: ['products', storeId, options?.includeInactive ?? false],
    queryFn: () => getProductsWithVariants(storeId!, options),
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
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
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

export function useToggleProductActive(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, isActive }: { productId: string; isActive: boolean }) =>
      toggleProductActive(productId, isActive),
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

export function useAssignInternalBarcode(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ variantId, barcode }: { variantId: string; barcode: string }) =>
      assignInternalBarcode(variantId, barcode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}

export function useAdjustVariantStock(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Parameters<typeof adjustVariantStock>[0]) =>
      adjustVariantStock(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
    },
  })
}

export function useBatchUpdatePrices(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: Parameters<typeof batchUpdatePrices>[0]) =>
      batchUpdatePrices(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}

export function useUpdateProductWithVariant(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: Parameters<typeof updateProductWithVariant>[0]) =>
      updateProductWithVariant(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements', storeId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_operational', storeId] })
    },
  })
}