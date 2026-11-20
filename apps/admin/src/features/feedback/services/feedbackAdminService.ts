import { supabase } from '../../../shared/lib/supabaseClient'
import type { AppFeedback, FeedbackStatus } from '@lumen-pos/types'

export async function getFeedbackList(): Promise<AppFeedback[]> {
  const { data, error } = await supabase
    .from('app_feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching feedback:', error)
    throw new Error(error.message)
  }

  return (data || []) as AppFeedback[]
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string | null
): Promise<AppFeedback> {
  const updatePayload: {
    status: FeedbackStatus
    updated_at: string
    admin_notes?: string | null
  } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (adminNotes !== undefined) {
    updatePayload.admin_notes = adminNotes
  }

  const { data, error } = await supabase
    .from('app_feedback')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating feedback status:', error)
    throw new Error(error.message)
  }

  return data as AppFeedback
}
