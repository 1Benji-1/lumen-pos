import { supabase } from '../../../shared/lib/supabaseClient'
import type { StaffMember, UserRole } from '@lumen-pos/types'

export interface CreateStaffInput {
  email: string
  fullName: string
  role: UserRole
  password?: string
}

export interface ActiveCashRegisterInfo {
  id: string
  opened_at: string
  opening_amount: number
}

/**
 * Traduce y clarifica mensajes técnicos de Supabase Auth, PostgreSQL o Edge Functions
 * a mensajes amigables y orientados a la operación del comerciante.
 */
export function translateStaffError(raw: string): string {
  if (!raw) return 'Ocurrió un error inesperado al procesar la solicitud.'

  const lower = raw.toLowerCase()

  if (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('email already in use') ||
    lower.includes('user already exists')
  ) {
    return 'Este correo electrónico ya está registrado en el sistema. Puedes invitarlo con otra dirección o verificar si ya tiene acceso.'
  }

  if (lower.includes('rate limit')) {
    return 'Se ha superado el límite de envíos de correo del servidor. Por favor espera unos minutos o utiliza la opción de contraseña provisional para darle acceso inmediato.'
  }

  if (lower.includes('invalid email') || lower.includes('invalid format')) {
    return 'La dirección de correo electrónico ingresada no tiene un formato válido.'
  }

  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'La contraseña provisional debe contener al menos 6 caracteres.'
  }

  if (lower.includes('violates foreign key constraint') || lower.includes('foreign key')) {
    return 'No es posible eliminar definitivamente a este colaborador porque tiene ventas o movimientos de caja históricos asociados. En su lugar, usa la opción "Suspender" para revocar su acceso manteniendo los registros contables intactos.'
  }

  if (lower.includes('solo el propietario')) {
    return 'Solo el propietario de la tienda tiene permisos para realizar esta acción.'
  }

  if (lower.includes('no posee permisos') || lower.includes('no tiene permisos')) {
    return 'No cuentas con los permisos administrativos necesarios para gestionar colaboradores.'
  }

  if (lower.includes('sesión no válida') || lower.includes('expirada') || lower.includes('authorization')) {
    return 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
  }

  if (lower.includes('edge function returned a non-2xx')) {
    return 'El servidor no pudo procesar la solicitud. Revisa los datos ingresados e intenta nuevamente.'
  }

  return raw
}

/**
 * Extrae el mensaje de error real desde la respuesta HTTP de Supabase Functions
 */
async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const failure = error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } }
  let message = failure?.message || fallback
  try {
    if (failure?.context && typeof failure.context.json === 'function') {
      const body = await failure.context.json()
      if (body?.error) {
        message = body.error
      }
    }
  } catch {
    // Si no se puede parsear json, usamos el mensaje original
  }
  return translateStaffError(message)
}

export async function getStaffMembers(storeId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, store_id, full_name, email, role, is_active, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(translateStaffError(error.message))
  }

  return (data || []).map((row) => ({
    id: row.id,
    store_id: row.store_id,
    full_name: row.full_name,
    email: row.email,
    role: row.role as UserRole,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
  }))
}

export async function createStaffMember(input: CreateStaffInput): Promise<StaffMember> {
  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body: {
      action: 'create',
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      role: input.role,
      password: input.password?.trim() || undefined,
    },
  })

  if (error) {
    const friendlyMsg = await extractFunctionErrorMessage(error, 'No fue posible registrar al colaborador')
    throw new Error(friendlyMsg)
  }

  if (data?.error) {
    throw new Error(translateStaffError(data.error))
  }

  return data.staff as StaffMember
}

async function manageStaff(body: { action: string; userId: string; role?: UserRole; isActive?: boolean }): Promise<void> {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body })
  if (error) {
    throw new Error(await extractFunctionErrorMessage(error, 'No fue posible administrar al colaborador'), { cause: error })
  }
  if (data?.error) throw new Error(translateStaffError(data.error))
}

export async function updateStaffRole(userId: string, role: UserRole): Promise<void> {
  await manageStaff({ action: 'update-role', userId, role })
}

export async function toggleStaffStatus(userId: string, isActive: boolean): Promise<void> {
  await manageStaff({ action: 'toggle-status', userId, isActive })
}

/**
 * Valida si un colaborador tiene un turno de caja abierta en este comercio antes de desvincularlo.
 */
export async function checkMemberActiveRegister(
  storeId: string,
  userId: string
): Promise<ActiveCashRegisterInfo | null> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('id, opened_at, opening_amount')
    .eq('store_id', storeId)
    .eq('opened_by', userId)
    .eq('status', 'open')
    .maybeSingle()

  if (error) {
    console.warn('Error al verificar caja registradora activa:', error)
    return null
  }

  return data as ActiveCashRegisterInfo | null
}

export async function deleteStaffMember(userId: string): Promise<void> {
  await manageStaff({ action: 'delete', userId })
}
