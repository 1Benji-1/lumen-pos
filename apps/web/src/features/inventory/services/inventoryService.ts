import { supabase } from '../../../shared/lib/supabaseClient'
import type { Tables, TablesInsert, TablesUpdate, ProductUnit, StockMovementType } from '@lumen-pos/types'

// ---------- Categorías ----------

export interface CategoryWithCount {
  id: string
  store_id: string
  name: string
  created_at: string
  product_count: number
}

export async function getCategories(storeId: string): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, products(id)')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error

  return (data ?? []).map((cat) => ({
    id: cat.id,
    store_id: cat.store_id,
    name: cat.name,
    created_at: cat.created_at,
    product_count: Array.isArray((cat as any).products) ? (cat as any).products.length : 0,
  }))
}

export async function createCategory(input: TablesInsert<'categories'>) {
  const { data, error } = await supabase.from('categories').insert(input).select().single()
  if (error) throw error
  return data
}

export async function deleteCategory(categoryId: string): Promise<void> {
  // 1. Verificación preventiva de productos asociados
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  if (countError) throw countError

  if (count && count > 0) {
    throw new Error(
      `No se puede eliminar la categoría porque contiene ${count} producto(s) asignado(s). Reasigna o desasocia los productos primero.`
    )
  }

  // 2. Ejecutar eliminación
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}

// ---------- Productos (con sus variantes) ----------

export async function getProductsWithVariants(
  storeId: string,
  options?: { includeInactive?: boolean }
) {
  let query = supabase
    .from('products')
    .select('*, product_variants(*, suppliers(name)), categories(name)')
    .eq('store_id', storeId)
    .order('name')

  if (!options?.includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error

  if (!options?.includeInactive && data) {
    return data.map((p) => ({
      ...p,
      product_variants: p.product_variants.filter((v: any) => v.is_active),
    }))
  }

  return data
}

export async function createProductWithVariant(params: {
  storeId: string
  name: string
  description?: string
  categoryId?: string | null
  variantName: string
  barcode?: string
  sku?: string
  costPrice: number
  salePrice: number
  stockQuantity: number
  lowStockThreshold?: number
  unit?: ProductUnit
  imageUrl?: string | null
  supplierId?: string | null
  trackBatch?: boolean
  batchNumber?: string | null
  expiryDate?: string | null
}) {
  const { data, error } = await supabase.rpc('create_product_with_variant', {
    p_product: {
      name: params.name,
      description: params.description ?? null,
      category_id: params.categoryId ?? null,
      image_url: params.imageUrl ?? null,
    },
    p_variant: {
      name: params.variantName,
      barcode: params.barcode ?? null,
      sku: params.sku ?? null,
      cost_price: params.costPrice,
      sale_price: params.salePrice,
      stock_quantity: params.stockQuantity,
      low_stock_threshold: params.lowStockThreshold ?? 5,
      unit: params.unit ?? 'unit',
      image_url: params.imageUrl ?? null,
      supplier_id: params.supplierId ?? null,
      track_batch: params.trackBatch ?? false,
      batch_number: params.batchNumber ?? null,
      expiry_date: params.expiryDate ?? null,
    },
  })
  if (error) throw error
  return data as unknown as { product: Tables<'products'>; variant: Tables<'product_variants'> }
}

export async function updateVariant(id: string, input: TablesUpdate<'product_variants'>) {
  const { data, error } = await supabase
    .from('product_variants')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Desactiva o reactiva un producto y sus variantes (Soft delete).
 * Mantiene intacto el historial de ventas y movimientos.
 */
export async function toggleProductActive(productId: string, isActive: boolean) {
  const { error: prodError } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
  if (prodError) throw prodError

  const { error: varError } = await supabase
    .from('product_variants')
    .update({ is_active: isActive })
    .eq('product_id', productId)
  if (varError) throw varError
}

export async function deleteProduct(id: string) {
  // Por compatibilidad, ahora ejecuta soft delete para evitar violaciones de foreign key en ventas
  return toggleProductActive(id, false)
}

export async function assignInternalBarcode(variantId: string, barcode: string) {
  const { data, error } = await supabase
    .from('product_variants')
    .update({ barcode })
    .eq('id', variantId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Ajusta el stock de una variante de forma atómica y registra el movimiento con auditoría.
 */
export async function adjustVariantStock(params: {
  variantId: string
  newStock: number
  type: StockMovementType
  reason?: string
}) {
  const { data, error } = await supabase.rpc('adjust_variant_stock', {
    p_variant_id: params.variantId,
    p_new_stock: params.newStock,
    p_type: params.type,
    p_reason: params.reason ?? undefined,
  })
  if (error) throw error
  return data
}

/**
 * Actualiza en lote los precios de venta o costo de múltiples variantes.
 */
export async function batchUpdatePrices(
  updates: { variantId: string; salePrice?: number; costPrice?: number }[]
) {
  const promises = updates.map((u) => {
    const patch: Partial<TablesUpdate<'product_variants'>> = {}
    if (u.salePrice !== undefined) patch.sale_price = u.salePrice
    if (u.costPrice !== undefined) patch.cost_price = u.costPrice
    return supabase.from('product_variants').update(patch).eq('id', u.variantId)
  })

  const results = await Promise.all(promises)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) throw firstError.error
  return true
}

/**
 * Actualiza un producto y su variante, registrando auditoría en stock_movements si el stock cambió.
 */
export async function updateProductWithVariant(params: {
  productId: string
  variantId: string
  product: {
    name: string
    categoryId?: string | null
    description?: string | null
  }
  variant: {
    name?: string
    barcode?: string | null
    sku?: string | null
    salePrice: number
    costPrice: number
    unit?: ProductUnit
    lowStockThreshold?: number
    supplierId?: string | null
    trackBatch?: boolean
    batchNumber?: string | null
    expiryDate?: string | null
    stockQuantity?: number
  }
  currentStock: number
  stockAdjustmentReason?: string
}) {
  // 1. Actualizar tabla products
  const { error: prodError } = await supabase
    .from('products')
    .update({
      name: params.product.name.trim(),
      category_id: params.product.categoryId || null,
      description: params.product.description?.trim() || null,
    })
    .eq('id', params.productId)
  if (prodError) throw prodError

  // 2. Actualizar tabla product_variants
  const variantPatch: TablesUpdate<'product_variants'> = {
    sale_price: params.variant.salePrice,
    cost_price: params.variant.costPrice,
    barcode: params.variant.barcode?.trim() || null,
    sku: params.variant.sku?.trim() || null,
    unit: params.variant.unit ?? 'unit',
    low_stock_threshold: params.variant.lowStockThreshold ?? 5,
    supplier_id: params.variant.supplierId || null,
    track_batch: params.variant.trackBatch ?? false,
    batch_number: params.variant.batchNumber?.trim() || null,
    expiry_date: params.variant.expiryDate || null,
  }
  if (params.variant.name !== undefined) {
    variantPatch.name = params.variant.name.trim() || 'Único'
  }

  const { error: varError } = await supabase
    .from('product_variants')
    .update(variantPatch)
    .eq('id', params.variantId)
  if (varError) throw varError

  // 3. Si el stock fue modificado en la edición, registrar en stock_movements mediante adjust_variant_stock
  if (
    params.variant.stockQuantity !== undefined &&
    Number(params.variant.stockQuantity) !== Number(params.currentStock)
  ) {
    const newStock = Number(params.variant.stockQuantity)
    if (isNaN(newStock) || newStock < 0) {
      throw new Error('La cantidad de stock no puede ser un valor negativo.')
    }

    const reason =
      params.stockAdjustmentReason?.trim() ||
      `Ajuste manual desde edición de producto (${params.currentStock} → ${newStock})`

    await adjustVariantStock({
      variantId: params.variantId,
      newStock,
      type: 'manual_adjustment',
      reason,
    })
  }

  return true
}