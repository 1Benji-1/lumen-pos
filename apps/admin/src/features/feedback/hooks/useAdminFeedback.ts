import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { FeedbackStatus } from '@lumen-pos/types'
import { getFeedbackList, updateFeedbackStatus } from '../services/feedbackAdminService'

export function useAdminFeedback() {
  return useQuery({
    queryKey: ['adminFeedback'],
    queryFn: getFeedbackList,
    staleTime: 1000 * 30,
  })
}

export function useUpdateAdminFeedbackStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string
      status: FeedbackStatus
      adminNotes?: string | null
    }) => updateFeedbackStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] })
    },
  })
}
