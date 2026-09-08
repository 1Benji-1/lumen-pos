import { supabase } from '../../../shared/lib/supabaseClient'
import type { TablesInsert, TablesUpdate } from '@lumen-pos/types'

// ---------- Categorías ----------

export async function getCategories(storeId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
  return data
}

export async function createCategory(input: TablesInsert<'categories'>) {
  const { data, error } = await supabase.from('categories').insert(input).select().single()
  if (error) throw error
  return data
}

// ---------- Productos (con sus variantes) ----------

export async function getProductsWithVariants(storeId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), categories(name)')
    .eq('store_id', storeId)
    .order('name')
  if (error) throw error
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
}) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      store_id: params.storeId,
      name: params.name,
      description: params.description,
      category_id: params.categoryId ?? null,
    })
    .select()
    .single()
  if (productError) throw productError

  const { data: variant, error: variantError } = await supabase
    .from('product_variants')
    .insert({
      store_id: params.storeId,
      product_id: product.id,
      name: params.variantName,
      barcode: params.barcode,
      sku: params.sku,
      cost_price: params.costPrice,
      sale_price: params.salePrice,
      stock_quantity: params.stockQuantity,
    })
    .select()
    .single()
  if (variantError) throw variantError

  return { product, variant }
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

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}