import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSale } from '../services/posService'

export function useCreateSale(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] })
    },
  })
}