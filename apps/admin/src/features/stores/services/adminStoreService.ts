import { supabase } from '../../../shared/lib/supabaseClient'
import type {
  BusinessType,
  RetailSubType,
  PlanCode,
  AdminStoreItem,
  SubscriptionStatus,
  BillingCycle,
  SubscriptionPayment,
} from '@lumen-pos/types'

export interface PlanItem {
  id: string
  code: PlanCode
  name: string
  features: Record<string, any>
  monthly_price: number
}

export interface StoreStaffMember {
  id: string
  store_id: string
  full_name: string | null
  email: string | null
  role: 'owner' | 'admin' | 'cashier' | 'stock_clerk'
  is_active: boolean
  created_at: string
}

export interface StoreCashRegisterItem {
  id: string
  store_id: string
  status: 'open' | 'closed'
  opening_amount: number
  closing_amount: number | null
  notes?: string | null
  opened_at: string
  closed_at: string | null
  opened_by: string
  opened_by_name?: string | null
}

export async function createStore(params: {
  email: string
  storeName: string
  fullName: string
  businessType: BusinessType
  industrySubType?: RetailSubType
  planCode: PlanCode
  subscriptionStatus: 'trialing' | 'active'
  billingCycle?: 'monthly' | 'semiannual' | 'annual'
}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) throw new Error('No hay sesión activa')

  const { data, error } = await supabase.functions.invoke('create-store', {
    body: params,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (error) throw error
  return data
}

export async function getStores(): Promise<AdminStoreItem[]> {
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_admin_stores_overview')

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData.map((row: any) => ({
      id: row.id,
      name: row.name,
      owner_id: row.owner_id,
      owner_name: row.owner_name ?? null,
      owner_email: row.owner_email ?? null,
      business_type: row.business_type as BusinessType,
      industry_sub_type: (row.industry_sub_type as RetailSubType) || 'comercio_general',
      plan_id: row.plan_id,
      plan_code: row.plan_code as PlanCode | null,
      plan_name: row.plan_name ?? null,
      plan_features: (row.plan_features as Record<string, any>) || {},
      subscription_status: row.subscription_status as SubscriptionStatus,
      billing_cycle: row.billing_cycle as BillingCycle | null,
      trial_ends_at: row.trial_ends_at,
      subscription_ends_at: row.subscription_ends_at ?? null,
      grace_period_days: row.grace_period_days ?? 5,
      created_at: row.created_at,
      feature_overrides: (row.feature_overrides as Record<string, any>) || {},
      products_count: row.products_count ?? 0,
      last_sale_at: row.last_sale_at ?? null,
      open_registers_count: row.open_registers_count ?? 0,
      active_users_count: row.active_users_count ?? 0,
      customers_count: row.customers_count ?? 0,
    }))
  }

  const { data, error } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      owner_id,
      business_type,
      industry_sub_type,
      plan_id,
      subscription_status,
      billing_cycle,
      trial_ends_at,
      subscription_ends_at,
      grace_period_days,
      created_at,
      feature_overrides,
      plans (
        id,
        code,
        name,
        features
      ),
      users (
        id,
        full_name,
        email,
        role
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => {
    const ownerUser = Array.isArray(row.users)
      ? row.users.find((u: any) => u.role === 'owner') || row.users[0]
      : row.users

    const plan = row.plans

    return {
      id: row.id,
      name: row.name,
      owner_id: row.owner_id,
      owner_name: ownerUser?.full_name ?? null,
      owner_email: ownerUser?.email ?? null,
      business_type: row.business_type as BusinessType,
      industry_sub_type: (row.industry_sub_type as RetailSubType) || 'comercio_general',
      plan_id: row.plan_id,
      plan_code: plan?.code as PlanCode | null,
      plan_name: plan?.name ?? null,
      plan_features: (plan?.features as Record<string, any>) || {},
      subscription_status: row.subscription_status as SubscriptionStatus,
      billing_cycle: row.billing_cycle as BillingCycle | null,
      trial_ends_at: row.trial_ends_at,
      subscription_ends_at: row.subscription_ends_at ?? null,
      grace_period_days: row.grace_period_days ?? 5,
      created_at: row.created_at,
      feature_overrides: (row.feature_overrides as Record<string, any>) || {},
    }
  })
}

export async function getPlans(): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, code, name, features, monthly_price')
    .order('monthly_price', { ascending: true })

  if (error) throw new Error(error.message)

  return (data || []).map((p: any) => ({
    id: p.id,
    code: p.code as PlanCode,
    name: p.name,
    features: (p.features as Record<string, any>) || {},
    monthly_price: Number(p.monthly_price),
  }))
}

export async function updateStoreFeatures(
  storeId: string,
  featureOverrides: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('stores')
    .update({ feature_overrides: featureOverrides })
    .eq('id', storeId)

  if (error) throw new Error(error.message)
}

export async function updateStoreSubscription(
  storeId: string,
  payload: {
    planId?: string
    subscriptionStatus?: SubscriptionStatus
    billingCycle?: BillingCycle | null
    trialEndsAt?: string
    subscriptionEndsAt?: string
    gracePeriodDays?: number
    name?: string
    industrySubType?: RetailSubType
  }
): Promise<void> {
  const updateData: {
    plan_id?: string
    subscription_status?: SubscriptionStatus
    billing_cycle?: BillingCycle | null
    trial_ends_at?: string
    subscription_ends_at?: string
    grace_period_days?: number
    name?: string
    industry_sub_type?: string
  } = {}
  if (payload.planId !== undefined) updateData.plan_id = payload.planId
  if (payload.subscriptionStatus !== undefined) updateData.subscription_status = payload.subscriptionStatus
  if (payload.billingCycle !== undefined) updateData.billing_cycle = payload.billingCycle
  if (payload.trialEndsAt !== undefined) updateData.trial_ends_at = payload.trialEndsAt
  if (payload.subscriptionEndsAt !== undefined) updateData.subscription_ends_at = payload.subscriptionEndsAt
  if (payload.gracePeriodDays !== undefined) updateData.grace_period_days = payload.gracePeriodDays
  if (payload.name !== undefined) updateData.name = payload.name
  if (payload.industrySubType !== undefined) updateData.industry_sub_type = payload.industrySubType

  const { error } = await supabase
    .from('stores')
    .update(updateData)
    .eq('id', storeId)

  if (error) throw new Error(error.message)
}

export async function getStorePayments(storeId: string): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('store_id', storeId)
    .order('paid_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: row.id,
    store_id: row.store_id,
    amount: Number(row.amount),
    payment_method: row.payment_method as 'transfer' | 'qr' | 'cash',
    reference: row.reference ?? null,
    period_start: row.period_start,
    period_end: row.period_end,
    paid_at: row.paid_at,
    recorded_by: row.recorded_by ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
  }))
}

export async function recordPaymentAndRenew(params: {
  storeId: string
  amount: number
  paymentMethod: 'transfer' | 'qr' | 'cash'
  reference?: string
  manualEndDate?: string
  notes?: string
}): Promise<void> {
  const { error } = await (supabase.rpc as any)('admin_record_payment_and_renew', {
    p_store_id: params.storeId,
    p_amount: params.amount,
    p_payment_method: params.paymentMethod,
    p_reference: params.reference?.trim() || null,
    p_manual_end_date: params.manualEndDate ? new Date(params.manualEndDate).toISOString() : null,
    p_notes: params.notes?.trim() || null,
  })

  if (error) throw new Error(error.message)
}

export async function toggleStoreSuspension(
  storeId: string,
  currentStatus: SubscriptionStatus
): Promise<SubscriptionStatus> {
  const nextStatus: SubscriptionStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
  const { error } = await supabase
    .from('stores')
    .update({ subscription_status: nextStatus })
    .eq('id', storeId)

  if (error) throw new Error(error.message)
  return nextStatus
}

export async function extendStoreTrial(
  storeId: string,
  daysToAdd: number,
  currentTrialEndsAt?: string
): Promise<string> {
  const baseDate = currentTrialEndsAt && new Date(currentTrialEndsAt) > new Date()
    ? new Date(currentTrialEndsAt)
    : new Date()

  baseDate.setDate(baseDate.getDate() + daysToAdd)
  const newDateIso = baseDate.toISOString()

  const { error } = await supabase
    .from('stores')
    .update({
      trial_ends_at: newDateIso,
      subscription_status: 'trialing',
    })
    .eq('id', storeId)

  if (error) throw new Error(error.message)
  return newDateIso
}

export async function getStoreStaff(storeId: string): Promise<StoreStaffMember[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, store_id, full_name, email, role, is_active, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as StoreStaffMember[]
}

export async function adminToggleUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export async function sendUserPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim()
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail)
  if (error) throw new Error(error.message)
}

export async function getStoreCashRegisters(storeId: string): Promise<StoreCashRegisterItem[]> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select(`
      id,
      store_id,
      status,
      opening_amount,
      closing_amount,
      notes,
      opened_at,
      closed_at,
      opened_by,
      users!cash_registers_opened_by_fkey (
        full_name
      )
    `)
    .eq('store_id', storeId)
    .order('opened_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: row.id,
    store_id: row.store_id,
    status: row.status as 'open' | 'closed',
    opening_amount: Number(row.opening_amount),
    closing_amount: row.closing_amount !== null ? Number(row.closing_amount) : null,
    notes: row.notes ?? null,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    opened_by: row.opened_by,
    opened_by_name: row.users?.full_name ?? null,
  }))
}

export async function forceCloseCashRegister(registerId: string): Promise<void> {
  const { error: rpcError } = await supabase.rpc('admin_force_close_cash_register', {
    p_register_id: registerId,
  })

  if (!rpcError) return

  const { data: reg, error: regError } = await supabase
    .from('cash_registers')
    .select('id, store_id, opening_amount')
    .eq('id', registerId)
    .single()

  if (regError || !reg) throw new Error(regError?.message || 'Caja no encontrada')

  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      id,
      payment_method,
      total,
      status,
      sale_payments (
        payment_method,
        amount
      )
    `)
    .eq('cash_register_id', registerId)
    .in('status', ['completed', 'refunded'])

  if (salesError) throw new Error(salesError.message)

  let cashSalesTotal = 0
  for (const s of sales || []) {
    const payments = (s as any).sale_payments || []
    if (payments.length > 0) {
      for (const p of payments) {
        if (p.payment_method === 'cash') {
          cashSalesTotal += Number(p.amount) || 0
        }
      }
    } else if (s.payment_method === 'cash') {
      cashSalesTotal += Number(s.total) || 0
    }
  }

  const { data: movements, error: movError } = await supabase
    .from('cash_movements')
    .select('type, amount')
    .eq('cash_register_id', registerId)

  if (movError) throw new Error(movError.message)

  let cashInTotal = 0
  let cashOutTotal = 0
  for (const m of movements || []) {
    const amt = Number(m.amount) || 0
    if (m.type === 'in') cashInTotal += amt
    else if (m.type === 'out') cashOutTotal += amt
  }

  const openingAmount = Number(reg.opening_amount) || 0
  const expectedCashAmount = Math.max(0, openingAmount + cashSalesTotal + cashInTotal - cashOutTotal)

  const { error } = await supabase
    .from('cash_registers')
    .update({
      status: 'closed',
      closing_amount: expectedCashAmount,
      closed_at: new Date().toISOString(),
      notes: 'cierre forzado por administrador, sin conteo',
    })
    .eq('id', registerId)

  if (error) throw new Error(error.message)
}