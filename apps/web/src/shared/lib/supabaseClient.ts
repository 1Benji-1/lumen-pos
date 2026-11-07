import { createClient } from '@supabase/supabase-js'
import type { Database } from '@lumen-pos/types'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

// Si la aplicación se abre de forma remota (Ngrok, túnel, celular o red local),
// redirige las peticiones al proxy de Vite en lugar de fallar buscando 127.0.0.1 en el dispositivo del visitante
const supabaseUrl =
  typeof window !== 'undefined' &&
  rawSupabaseUrl.includes('127.0.0.1') &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? window.location.origin
    : rawSupabaseUrl

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)