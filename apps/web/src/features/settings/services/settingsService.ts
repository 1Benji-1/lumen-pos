import { supabase } from '../../../shared/lib/supabaseClient'
import type { StoreSettings, UpdateStoreSettingsInput } from '@lumen-pos/types'

export async function getStoreSettings(storeId: string): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('store_id', storeId)
    .single()

  if (error) {
    // Si no existe fila, crearla al vuelo con valores por defecto
    if (error.code === 'PGRST116') {
      const { data: created, error: insertError } = await supabase
        .from('store_settings')
        .insert({ store_id: storeId })
        .select('*')
        .single()

      if (insertError) throw new Error(insertError.message)
      return created as unknown as StoreSettings
    }
    throw new Error(error.message)
  }

  return data as unknown as StoreSettings
}

export async function updateStoreSettings(
  storeId: string,
  input: UpdateStoreSettingsInput
): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  // Sincronizar el nombre en la tabla stores si commercial_name vino en la actualización
  if (input.commercial_name !== undefined && input.commercial_name !== null) {
    const trimmed = input.commercial_name.trim()
    if (trimmed) {
      try {
        await supabase
          .from('stores')
          .update({ name: trimmed })
          .eq('id', storeId)
      } catch {
        // En caso de que las políticas RLS restrinjan la modificación directa de stores
      }
    }
  }

  return data as unknown as StoreSettings
}
