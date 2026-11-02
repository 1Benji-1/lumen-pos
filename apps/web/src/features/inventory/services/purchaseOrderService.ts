import { supabase } from '../../../shared/lib/supabaseClient'
import type { PurchaseOrder } from '@lumen-pos/types'

export async function getPurchaseOrders(storeId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      `
      *,
      suppliers (
        id,
        name,
        contact_name,
        phone,
        email
      ),
      purchase_order_items (
        id,
        purchase_order_id,
        variant_id,
        quantity,
        cost_price,
        subtotal,
        product_variants (
          id,
          name,
          barcode,
          unit,
          products (
            id,
            name
          )
        )
      )
    `
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as PurchaseOrder[]) ?? []
}

export async function createPurchaseOrder(params: {
  storeId: string
  supplierId: string
  orderNumber: string
  notes?: string
  items: {
    variantId: string
    quantity: number
    costPrice: number
  }[]
}) {
  const totalCost = params.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0)

  // 1. Insert order
  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .insert({
      store_id: params.storeId,
      supplier_id: params.supplierId,
      order_number: params.orderNumber,
      status: 'pending',
      total_cost: totalCost,
      notes: params.notes || null,
      ordered_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (orderError) throw orderError

  // 2. Insert items
  const itemsToInsert = params.items.map((it) => ({
    purchase_order_id: order.id,
    variant_id: it.variantId,
    quantity: it.quantity,
    cost_price: it.costPrice,
    subtotal: it.quantity * it.costPrice,
  }))

  const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert)
  if (itemsError) throw itemsError

  return order
}

export async function receivePurchaseOrder(orderId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('receive_purchase_order', {
    p_order_id: orderId,
  })
  if (error) throw error
  return data
}

export async function cancelPurchaseOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
  if (error) throw error
}
