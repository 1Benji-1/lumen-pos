import { supabase } from '../../../shared/lib/supabaseClient'

export function formatAuthError(err: unknown): string {
  if (!err) return 'Ocurrió un error inesperado al procesar la solicitud.'
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'El correo electrónico o la contraseña son incorrectos. Verifique sus credenciales.'
  }
  if (lower.includes('email not confirmed')) {
    return 'El correo electrónico no ha sido confirmado aún. Revise su bandeja de entrada.'
  }
  if (lower.includes('user not found')) {
    return 'No encontramos una cuenta registrada con este correo electrónico.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return 'Demasiados intentos seguidos. Por seguridad, espere unos momentos antes de reintentar.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('connection')) {
    return 'No se pudo conectar con el servidor. Verifique la conexión a internet de la tienda.'
  }
  if (lower.includes('password should be at least') || lower.includes('weak_password')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  return message || 'Error al procesar la autenticación.'
}

export async function signIn(email: string, password: string) {
  const cleanEmail = email.trim()
  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const cleanEmail = email.trim()
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}