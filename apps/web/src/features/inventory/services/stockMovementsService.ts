import { supabase } from '../../../shared/lib/supabaseClient'
import type { StockMovement } from '@lumen-pos/types'

export async function getStockMovements(params: {
  storeId: string
  variantId?: string
  type?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<StockMovement[]> {
  let query = supabase
    .from('stock_movements')
    .select(
      `
      *,
      product_variants (
        id,
        name,
        barcode,
        unit,
        stock_quantity,
        products (
          id,
          name
        )
      ),
      users!stock_movements_performed_by_fkey (
        id,
        full_name,
        email,
        role
      )
    `
    )
    .eq('store_id', params.storeId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 300)

  if (params.variantId) {
    query = query.eq('variant_id', params.variantId)
  }

  if (params.type && params.type !== 'all') {
    if (params.type === 'critical') {
      query = query.in('type', ['waste', 'supplier_return'])
    } else {
      query = query.eq('type', params.type)
    }
  }

  if (params.userId && params.userId !== 'all') {
    query = query.eq('performed_by', params.userId)
  }

  if (params.startDate) {
    query = query.gte('created_at', params.startDate)
  }

  if (params.endDate) {
    query = query.lte('created_at', params.endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as unknown as StockMovement[]) ?? []
}
