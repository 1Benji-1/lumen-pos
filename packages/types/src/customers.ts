export interface CustomerWithMetrics {
  id: string
  store_id: string
  full_name: string
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  total_purchases: number
  last_purchase_at: string | null
  total_spent: number
}

export interface CustomerDuplicateMatch {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  matched_by: 'phone' | 'email' | 'phone_and_email' | string
}

export interface CreateCustomerInput {
  full_name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface UpdateCustomerInput {
  full_name?: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  is_active?: boolean
}
