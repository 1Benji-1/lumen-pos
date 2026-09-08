import { supabase } from '../../../shared/lib/supabaseClient'

export async function getOpenCashRegister(storeId: string) {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'open')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function openCashRegister(params: {
  storeId: string
  userId: string
  openingAmount: number
}) {
  const { data, error } = await supabase
    .from('cash_registers')
    .insert({
      store_id: params.storeId,
      opened_by: params.userId,
      opening_amount: params.openingAmount,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function closeCashRegister(params: { id: string; closingAmount: number }) {
  const { data, error } = await supabase
    .from('cash_registers')
    .update({
      closing_amount: params.closingAmount,
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export type SaleItemInput = {
  product_variant_id: string
  quantity: number
}

export async function createSale(params: {
  cashRegisterId: string
  paymentMethod: 'cash' | 'card'
  items: SaleItemInput[]
  customerId?: string | null
}) {
  const { data, error } = await supabase.rpc('create_sale', {
    p_cash_register_id: params.cashRegisterId,
    p_payment_method: params.paymentMethod,
    p_items: params.items,
    p_customer_id: params.customerId ?? null,
  })
  if (error) throw error
  return data
}