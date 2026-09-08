import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCategories, createCategory } from '../services/inventoryService'

export function useCategories(storeId: string | null) {
  return useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => getCategories(storeId!),
    enabled: !!storeId,
  })
}

export function useCreateCategory(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createCategory({ store_id: storeId!, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', storeId] })
    },
  })
}