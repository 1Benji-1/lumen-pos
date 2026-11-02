import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../services/supplierService'
import type { TablesInsert, TablesUpdate } from '@lumen-pos/types'

export function useSuppliers(storeId: string | null) {
  return useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: () => getSuppliers(storeId!),
    enabled: !!storeId,
  })
}

export function useCreateSupplier(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<TablesInsert<'suppliers'>, 'store_id'>) =>
      createSupplier({ ...input, store_id: storeId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
    },
  })
}

export function useUpdateSupplier(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TablesUpdate<'suppliers'> }) =>
      updateSupplier(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
    },
  })
}

export function useDeleteSupplier(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', storeId] })
    },
  })
}
