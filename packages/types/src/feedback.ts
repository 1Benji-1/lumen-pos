export type FeedbackType = 'issue' | 'idea'
export type FeedbackStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed'

export interface AppFeedback {
  id: string
  store_id: string | null
  user_id: string | null
  type: FeedbackType
  title: string
  description: string
  page_url?: string | null
  user_email?: string | null
  user_role?: string | null
  store_name?: string | null
  status: FeedbackStatus
  admin_notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateFeedbackInput {
  store_id?: string | null
  user_id?: string | null
  type: FeedbackType
  title: string
  description: string
  page_url?: string | null
  user_email?: string | null
  user_role?: string | null
  store_name?: string | null
}
