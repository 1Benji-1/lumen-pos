import { supabase } from '../../../shared/lib/supabaseClient'
import type {
  CustomerWithMetrics,
  CustomerDuplicateMatch,
  CreateCustomerInput,
  UpdateCustomerInput,
  TablesUpdate,
} from '@lumen-pos/types'

/**
 * Obtiene la lista de clientes enriquecida con métricas de frecuencia y compra
 */
export async function getCustomers(
  storeId: string,
  options?: {
    status?: 'active' | 'inactive' | 'all'
    search?: string
  }
): Promise<CustomerWithMetrics[]> {
  let query = supabase
    .from('customer_metrics')
    .select('*')
    .eq('store_id', storeId)
    .order('full_name')

  if (options?.status === 'active') {
    query = query.eq('is_active', true)
  } else if (options?.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error } = await query
  if (error) throw error

  const mapped: CustomerWithMetrics[] = (data ?? []).map((row) => ({
    id: row.id!,
    store_id: row.store_id!,
    full_name: row.full_name!,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
    total_purchases: Number(row.total_purchases) || 0,
    last_purchase_at: row.last_purchase_at,
    total_spent: Number(row.total_spent) || 0,
  }))

  if (!options?.search?.trim()) {
    return mapped
  }

  const term = options.search.toLowerCase().trim()
  return mapped.filter(
    (c) =>
      c.full_name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.notes && c.notes.toLowerCase().includes(term))
  )
}

/**
 * Valida si existe otro cliente en la tienda con el mismo teléfono o correo
 */
export async function checkDuplicateCustomer(params: {
  storeId: string
  phone?: string | null
  email?: string | null
  excludeCustomerId?: string
}): Promise<CustomerDuplicateMatch | null> {
  const cleanPhone = params.phone?.trim() || null
  const cleanEmail = params.email?.trim() || null

  if (!cleanPhone && !cleanEmail) {
    return null
  }

  const { data, error } = await supabase.rpc('check_duplicate_customer', {
    p_store_id: params.storeId,
    p_phone: cleanPhone ?? undefined,
    p_email: cleanEmail ?? undefined,
    p_exclude_customer_id: params.excludeCustomerId ?? undefined,
  })

  if (error) throw error

  if (data && data.length > 0) {
    const first = data[0]
    return {
      id: first.id,
      full_name: first.full_name,
      phone: first.phone,
      email: first.email,
      matched_by: first.matched_by,
    }
  }

  return null
}

/**
 * Registra un nuevo cliente con validación previa de duplicados
 */
export async function createCustomer(
  storeId: string,
  input: CreateCustomerInput
): Promise<CustomerWithMetrics> {
  // Verificar duplicados
  const duplicate = await checkDuplicateCustomer({
    storeId,
    phone: input.phone,
    email: input.email,
  })

  if (duplicate) {
    const reason =
      duplicate.matched_by === 'phone'
        ? `el teléfono ${duplicate.phone}`
        : duplicate.matched_by === 'email'
        ? `el correo ${duplicate.email}`
        : 'el mismo teléfono y correo'
    throw new Error(
      `Ya existe un cliente registrado con ${reason}: "${duplicate.full_name}".`
    )
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      store_id: storeId,
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    store_id: data.store_id,
    full_name: data.full_name,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    is_active: data.is_active,
    created_at: data.created_at,
    total_purchases: 0,
    last_purchase_at: null,
    total_spent: 0,
  }
}

/**
 * Actualiza los datos de un cliente existente (con verificación de duplicados)
 */
export async function updateCustomer(
  customerId: string,
  storeId: string,
  input: UpdateCustomerInput
): Promise<void> {
  if (input.phone || input.email) {
    const duplicate = await checkDuplicateCustomer({
      storeId,
      phone: input.phone,
      email: input.email,
      excludeCustomerId: customerId,
    })

    if (duplicate) {
      const reason =
        duplicate.matched_by === 'phone'
          ? `el teléfono ${duplicate.phone}`
          : duplicate.matched_by === 'email'
          ? `el correo ${duplicate.email}`
          : 'el mismo teléfono y correo'
      throw new Error(
        `No se puede actualizar: ya existe otro cliente con ${reason}: "${duplicate.full_name}".`
      )
    }
  }

  const updatePayload: TablesUpdate<'customers'> = {}
  if (input.full_name !== undefined) updatePayload.full_name = input.full_name.trim()
  if (input.phone !== undefined) updatePayload.phone = input.phone?.trim() || null
  if (input.email !== undefined) updatePayload.email = input.email?.trim() || null
  if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active

  const { error } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', customerId)

  if (error) throw error
}

/**
 * Desactiva o reactiva a un cliente (baja lógica sin borrar compras)
 */
export async function toggleCustomerActive(
  customerId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ is_active: isActive })
    .eq('id', customerId)

  if (error) throw error
}

/**
 * Obtiene el historial de compras de un cliente con detalle de productos
 */
export async function getCustomerPurchaseHistory(customerId: string) {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `
      *,
      sale_items (
        id,
        quantity,
        subtotal,
        product_variants (
          id,
          name,
          sale_price
        )
      )
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}