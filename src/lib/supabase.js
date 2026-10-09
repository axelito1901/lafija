const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && key)
// Solo se descarga el cliente de Supabase cuando hay un proyecto conectado; en modo demo no pesa nada.
export const supabase = isSupabaseConfigured ? (await import('@supabase/supabase-js')).createClient(url, key) : null
