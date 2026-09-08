import { supabase } from '../../../shared/lib/supabaseClient'
import type { TablesInsert } from '@lumen-pos/types'

export async function getCustomers(storeId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('full_name')
  if (error) throw error
  return data
}

export async function createCustomer(input: TablesInsert<'customers'>) {
  const { data, error } = await supabase.from('customers').insert(input).select().single()
  if (error) throw error
  return data
}

export async function getCustomerPurchaseHistory(customerId: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*, product_variants(name, sale_price))')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}