import { supabase } from '../../../shared/lib/supabaseClient'
import type { TablesInsert, TablesUpdate, Supplier } from '@lumen-pos/types'

export async function getSuppliers(storeId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('store_id', storeId)
    .order('name')

  if (error) throw error
  return (data as Supplier[]) ?? []
}

export async function createSupplier(input: TablesInsert<'suppliers'>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Supplier
}

export async function updateSupplier(id: string, input: TablesUpdate<'suppliers'>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
