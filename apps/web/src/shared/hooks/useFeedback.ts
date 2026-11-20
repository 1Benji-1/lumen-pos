import { useMutation } from '@tanstack/react-query'
import { submitFeedback } from '../services/feedbackService'
import type { CreateFeedbackInput } from '@lumen-pos/types'

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: CreateFeedbackInput) => submitFeedback(input),
  })
}
