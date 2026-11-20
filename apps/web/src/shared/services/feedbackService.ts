import { supabase } from '../lib/supabaseClient'
import type { AppFeedback, CreateFeedbackInput } from '@lumen-pos/types'

export async function submitFeedback(input: CreateFeedbackInput): Promise<AppFeedback> {
  const { data, error } = await supabase
    .from('app_feedback')
    .insert([input])
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as AppFeedback
}
